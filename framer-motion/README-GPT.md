Berikut adalah Cheat Sheet lengkap untuk menggunakan **Framer Motion** dalam React:

---

### 🚀 **Instalasi**
```bash
npm install framer-motion
```

---

### 🎬 **Animasi Dasar**

#### Motion Components
```jsx
import { motion } from "framer-motion";

<motion.div
  animate={{ x: 100 }}
  transition={{ duration: 1 }}
>
  Animasi Sederhana
</motion.div>
```

---

### 🧩 **Properti Animasi**

| Properti | Deskripsi |
|----------|-----------|
| `animate` | Mengatur properti akhir dari animasi |
| `initial` | Mengatur properti awal animasi |
| `exit` | Properti animasi saat komponen keluar (khusus AnimatePresence) |
| `transition` | Durasi dan tipe transisi animasi |
| `whileHover` | Animasi saat hover |
| `whileTap` | Animasi saat tap/click |
| `whileDrag` | Animasi saat drag |
| `variants` | Mengelompokkan properti animasi |

---

### 🧮 **Properti Transisi**

| Properti | Deskripsi |
|----------|-----------|
| `duration` | Durasi animasi dalam detik |
| `ease` | Tipe easing (`easeIn`, `easeOut`, `easeInOut`, `linear`) |
| `delay` | Penundaan animasi |
| `repeat` | Jumlah pengulangan animasi |
| `repeatType` | `loop`, `mirror`, `reverse` |
| `stiffness` | Kekakuan dalam animasi spring |
| `damping` | Peredaman dalam animasi spring |

---

### 💡 **Animasi Variants**
```jsx
const boxVariants = {
  hidden: { opacity: 0, x: -100 },
  visible: { opacity: 1, x: 0 }
};

<motion.div
  initial="hidden"
  animate="visible"
  variants={boxVariants}
  transition={{ duration: 0.5 }}
>
  Variants Animasi
</motion.div>
```

---

### 🕹️ **Interactive Props**

| Prop        | Deskripsi |
|-------------|-----------|
| `whileHover` | Animasi saat hover |
| `whileTap` | Animasi saat click/tap |
| `whileDrag` | Animasi saat drag |
| `drag` | Aktifkan draggable |
| `dragConstraints` | Batas drag |
| `dragElastic` | Elastisitas drag |

#### Contoh:
```jsx
<motion.div
  whileHover={{ scale: 1.2 }}
  whileTap={{ scale: 0.9 }}
  drag
  dragConstraints={{ left: 0, right: 300 }}
>
  Drag & Hover
</motion.div>
```

---

### 🔁 **Keyframe Animasi**
```jsx
<motion.div
  animate={{ x: [0, 50, 100, 50, 0], opacity: [1, 0.5, 1] }}
  transition={{ duration: 2, ease: "easeInOut" }}
>
  Keyframe Animasi
</motion.div>
```

---

### 🧲 **AnimatePresence (Animasi Mount/Unmount)**
```jsx
import { AnimatePresence, motion } from "framer-motion";

const Component = ({ isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        Fade In/Out
      </motion.div>
    )}
  </AnimatePresence>
);
```

---

### 🌀 **Gestur & Drag**
#### Drag dengan Batasan
```jsx
<motion.div
  drag
  dragConstraints={{ left: -100, right: 100, top: -50, bottom: 50 }}
>
  Drag dengan Batas
</motion.div>
```

---

### 📏 **Scroll-based Animation**
```jsx
import { motion, useScroll, useTransform } from "framer-motion";

const ScrollAnimation = () => {
  const { scrollY } = useScroll();
  const yRange = useTransform(scrollY, [0, 300], [0, 100]);

  return (
    <motion.div style={{ y: yRange }}>
      Scroll Animasi
    </motion.div>
  );
};
```

---

### 🔧 **Hook Animasi**
#### `useAnimation`
```jsx
import { useAnimation } from "framer-motion";

const controls = useAnimation();

<button onClick={() => controls.start({ x: 100 })}>
  Start Animation
</button>

<motion.div animate={controls}>
  Kontrol Animasi
</motion.div>
```

#### `useCycle`
```jsx
import { useCycle } from "framer-motion";

const [x, cycleX] = useCycle(0, 100, 200);

<button onClick={() => cycleX()}>Cycle Animation</button>

<motion.div animate={{ x }}>
  Cycle Animasi
</motion.div>
```

---

### 🛠️ **Easing Functions**
| Easing | Keterangan |
|-------|------------|
| `easeIn` | Mempercepat di awal |
| `easeOut` | Memperlambat di akhir |
| `easeInOut` | Gabungan ease-in dan ease-out |
| `linear` | Gerakan konstan |

---

Cheat Sheet ini mencakup semua dasar penggunaan **Framer Motion** dalam React. Apakah ada bagian yang ingin dijelaskan lebih dalam atau demo animasi tertentu yang ingin dicoba? 🎨
