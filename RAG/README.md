# SIMPLE RAG WITH QDRANT

```ts
/* eslint-disable @typescript-eslint/no-explicit-any */
const QDRANT_URL = "https://qdrant.wibudev.com";
const OLLAMA_URL = "https://ai.wibudev.com";

async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "nomic-embed-text:latest",
      prompt: text,
    }),
  });
  
  const data = await res.json();
  
  if (!data.embedding) {
    console.error("Embedding API response:", JSON.stringify(data, null, 2));
    throw new Error("Failed to get embeddings");
  }
  
  return data.embedding;
}

async function upsertToQdrant(id: string, text: string) {
  try {
    const vector = await embed(text);
    
    // Convert string ID to number if it's numeric
    const pointId = /^\d+$/.test(id) ? parseInt(id, 10) : id;
    
    const response = await fetch(`${QDRANT_URL}/collections/rga-documents/points?wait=true`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        points: [
          {
            id: pointId,
            vector,
            payload: { text },
          },
        ],
      }),
    });
    
    const result = await response.json();
    console.log(`✅ Upsert document ${id} result:`, JSON.stringify(result, null, 2));
    
    if (!result.status || result.status !== "ok") {
      throw new Error(`Qdrant upsert failed for document ${id}: ${JSON.stringify(result)}`);
    }
  } catch (error) {
    console.error(`❌ Error upserting document ${id}:`, error);
    throw error;
  }
}

async function createCollectionIfNotExists() {
  try {
    // Check if collection exists
    const checkResponse = await fetch(`${QDRANT_URL}/collections/rga-documents`);
    
    if (checkResponse.status === 404) {
      console.log("Collection doesn't exist, creating it...");
      
      // Create the collection with appropriate vector size for nomic-embed-text (768 dimensions)
      const createResponse = await fetch(`${QDRANT_URL}/collections/rga-documents`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vectors: {
            size: 768,
            distance: "Cosine",
          },
        }),
      });
      
      const result = await createResponse.json();
      console.log("Collection creation result:", JSON.stringify(result, null, 2));
      
      if (result.status !== "ok") {
        throw new Error(`Failed to create collection: ${JSON.stringify(result)}`);
      }
    } else {
      console.log("Collection already exists.");
    }
  } catch (error) {
    console.error("Error checking/creating collection:", error);
    throw error;
  }
}

async function searchQdrant(query: string): Promise<string[]> {
  try {
    const queryVector = await embed(query);
    
    // Log the query vector length to ensure it matches the vector dimension in Qdrant
    console.log(`Query vector length: ${queryVector.length}`);
    
    const res = await fetch(
      `${QDRANT_URL}/collections/rga-documents/points/search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vector: queryVector,
          limit: 5,
          with_payload: true,
          score_threshold: 0.2,
        }),
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Qdrant search HTTP error: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    
    console.log("🔎 Qdrant search response:", JSON.stringify(data, null, 2));
    
    if (!data.result) {
      throw new Error("Qdrant search failed: " + JSON.stringify(data));
    }
    
    return data.result.map((item: any) => item.payload.text);
  } catch (error) {
    console.error("Error searching Qdrant:", error);
    throw error;
  }
}

async function chatWithContext(question: string) {
  try {
    // 1. Search for context from Qdrant
    const contexts = await searchQdrant(question);
    
    // Handle case when no contexts are found
    if (contexts.length === 0) {
      console.log("No relevant contexts found in database");
    }
    
    const systemPrompt = `
Kamu adalah asisten yang membantu menjawab pertanyaan berbasis dokumen.
${contexts.length > 0 
  ? `Gunakan informasi berikut: \n${contexts.map((c, i) => `Dokumen #${i + 1}: ${c}`).join("\n\n")}`
  : "Tidak ada dokumen relevan yang ditemukan. Berikan jawaban umum berdasarkan pengetahuanmu."
}`;
    
    // 2. Send to Qwen3:4b model
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen3:4b",
        stream: false,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
      }),
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`LLM API HTTP error: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    return data.message?.content || data;
  } catch (error) {
    console.error("Error in RAG process:", error);
    return `Error processing your request: ${error}`;
  }
}

// 🟢 Example usage:
(async () => {
  try {
    console.log("🚀 Starting RAG example...");
    
    // First, ensure the collection exists
    await createCollectionIfNotExists();
    
    // Step 1: Add documents to Qdrant
    // Using numeric IDs since Qdrant requires unsigned integers or UUIDs
    const docs = [
      { id: "1", text: "Next.js adalah framework React untuk server-side rendering." },
      { id: "2", text: "Qdrant adalah vektor database untuk pencarian semantik." },
      { id: "3", text: "Qwen3 adalah model bahasa besar dari Alibaba." },
      { id: "4", text: "Qdrant bisa melakukan pencarian similarity menggunakan HNSW graph." },
      { id: "5", text: "Qdrant dibuat untuk keperluan vector search seperti rekomendasi dan NLP search." }
    ];
    
    console.log("📝 Adding documents to Qdrant...");
    for (const doc of docs) {
      await upsertToQdrant(doc.id, doc.text);
    }
    
    // Step 2: Query the RAG system
    console.log("❓ Querying: 'Apa itu Qdrant?'");
    const answer = await chatWithContext("Apa itu Qdrant?");
    const context = answer.replace(/<think[^>]*?>[\s\S]*?<\/think>/gi, "");
    console.log("💬 Jawaban:", context);
  } catch (error) {
    console.error("❌ Main execution error:", error);
  }
})();

```
