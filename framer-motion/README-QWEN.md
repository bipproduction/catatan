Berikut adalah **cheat sheet** lengkap untuk **Framer Motion** dalam React, yang mencakup berbagai fitur utama dan penggunaan dasar hingga lanjutan. Ini dirancang untuk membantu Anda memahami dan menggunakan Framer Motion dengan lebih efisien.

---

### **1. Instalasi**
Untuk menggunakan Framer Motion, instal terlebih dahulu paketnya:
```bash
npm install framer-motion
```

---

### **2. Animasi Dasar**
#### **a. Menggerakkan Elemen**
Gunakan `motion` untuk membuat animasi sederhana.
```jsx
import { motion } from "framer-motion";

function App() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -100 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 1 }}
    >
      Hello, Framer Motion!
    </motion.div>
  );
}
```

#### **b. Variants (Variasi)**
Gunakan `variants` untuk mengatur animasi yang dapat digunakan kembali.
```jsx
import { motion } from "framer-motion";

const variants = {
  hidden: { opacity: 0, x: -100 },
  visible: { opacity: 1, x: 0 },
};

function App() {
  return (
    <motion.div
      variants={variants}
      initial="hidden"
      animate="visible"
      transition={{ duration: 1 }}
    >
      Hello, Variants!
    </motion.div>
  );
}
```

---

### **3. Transisi**
#### **a. Durasi dan Easing**
Atur durasi dan easing untuk animasi.
```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 2, ease: "easeInOut" }}
/>
```

#### **b. Delay**
Tambahkan delay sebelum animasi dimulai.
```jsx
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 1, delay: 0.5 }}
/>
```

#### **c. Spring Animation**
Gunakan spring untuk animasi yang lebih dinamis.
```jsx
<motion.div
  initial={{ scale: 0 }}
  animate={{ scale: 1 }}
  transition={{ type: "spring", stiffness: 100, damping: 10 }}
/>
```

---

### **4. Gestures (Interaksi Pengguna)**
#### **a. Hover**
Animasi saat elemen di-hover.
```jsx
<motion.div
  whileHover={{ scale: 1.2 }}
  transition={{ duration: 0.3 }}
>
  Hover Me!
</motion.div>
```

#### **b. Tap (Klik)**
Animasi saat elemen diklik.
```jsx
<motion.div
  whileTap={{ scale: 0.9 }}
  transition={{ duration: 0.2 }}
>
  Tap Me!
</motion.div>
```

#### **c. Drag**
Buat elemen yang bisa di-drag.
```jsx
<motion.div
  drag
  dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
  whileDrag={{ scale: 1.1 }}
>
  Drag Me!
</motion.div>
```

---

### **5. Animate Presence**
Gunakan `AnimatePresence` untuk animasi keluar/masuk elemen.
```jsx
import { motion, AnimatePresence } from "framer-motion";

function App({ isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          I'm Visible!
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

---

### **6. Layout Animations**
Animasi otomatis saat layout berubah.
```jsx
<motion.div layout>
  <motion.div layoutId="box" />
</motion.div>
```

---

### **7. Scroll Animations**
Gunakan `useInView` atau `useScroll` untuk animasi berbasis scroll.
```jsx
import { motion, useInView } from "framer-motion";

function App() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 1 }}
    >
      Scroll to see me!
    </motion.div>
  );
}
```

---

### **8. Keyframes**
Gunakan keyframes untuk animasi multi-step.
```jsx
<motion.div
  animate={{
    scale: [1, 1.5, 1],
    rotate: [0, 180, 360],
  }}
  transition={{ duration: 2 }}
/>
```

---

### **9. SVG Animations**
Animasi pada elemen SVG.
```jsx
<motion.path
  d="M10 10 H 90 V 90 H 10 Z"
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 2 }}
/>
```

---

### **10. Custom Properties**
Gunakan properti khusus untuk animasi.
```jsx
<motion.div
  style={{ background: "#ff0000" }}
  animate={{ background: "#00ff00" }}
  transition={{ duration: 2 }}
/>
```

---

### **11. Shared Layout Animations**
Gunakan `layoutId` untuk animasi antar-elemen.
```jsx
<motion.div layoutId="box">
  <motion.div layoutId="box" />
</motion.div>
```

---

### **12. Advanced: Motion Values**
Gunakan `useMotionValue` untuk kontrol manual.
```jsx
import { motion, useMotionValue, useTransform } from "framer-motion";

function App() {
  const x = useMotionValue(0);
  const background = useTransform(x, [-100, 100], ["#ff0000", "#00ff00"]);

  return (
    <motion.div
      style={{ x, background }}
      drag="x"
      dragConstraints={{ left: -100, right: 100 }}
    >
      Drag Me!
    </motion.div>
  );
}
```

---

### **13. Performance Tips**
- Gunakan `initial` hanya jika diperlukan.
- Hindari animasi berat pada elemen besar.
- Gunakan `will-change` untuk optimasi CSS.

---

Dengan cheat sheet ini, Anda dapat memulai dan menguasai **Framer Motion** untuk membuat animasi interaktif dan responsif di aplikasi React Anda. Jika Anda membutuhkan penjelasan lebih lanjut tentang salah satu bagian, silakan tanyakan!
