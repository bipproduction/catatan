```ts
// 1. BASIC ANIMATION
// Animate elemen dengan properti basic
<motion.div
  animate={{
    x: 100,
    y: 200,
    scale: 2,
    rotate: 360,
    opacity: 0.5
  }}
/>

// 2. TRANSITION OPTIONS
// Kustomisasi cara animasi berjalan
<motion.div
  animate={{ x: 100 }}
  transition={{
    duration: 2,
    delay: 0.5,
    ease: "easeInOut",
    type: "spring",
    stiffness: 100,
    damping: 10,
    mass: 1
  }}
/>

// 3. GESTURES
// Merespons interaksi pengguna
<motion.div
  whileHover={{ scale: 1.2 }}
  whileTap={{ scale: 0.9 }}
  drag="x"  // atau "y" atau true untuk kedua arah
  dragConstraints={{ left: -100, right: 100 }}
  dragElastic={0.2}
/>

// 4. VARIANTS
// Mendefinisikan state animasi yang bisa digunakan ulang
const variants = {
  hidden: { opacity: 0, x: -100 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: {
      duration: 0.5,
      staggerChildren: 0.1
    }
  }
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
/>

// 5. ANIMATION CONTROLS
// Mengontrol animasi secara programatik
const controls = useAnimation();

<motion.div
  animate={controls}
/>

// Trigger animasi
controls.start({
  x: 100,
  transition: { duration: 1 }
});

// 6. SCROLL ANIMATIONS
// Animasi berbasis scroll
<motion.div
  initial={{ opacity: 0 }}
  whileInView={{ opacity: 1 }}
  viewport={{ once: true, margin: "-100px" }}
/>

// 7. EXIT ANIMATIONS
// Animasi saat elemen dihapus
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>

// 8. LAYOUT ANIMATIONS
// Animasi otomatis saat layout berubah
<motion.div layout />

// 9. KEYFRAMES
// Animasi multi-step
<motion.div
  animate={{
    x: [0, 100, 0],
    backgroundColor: ["#ff0000", "#00ff00", "#0000ff"]
  }}
/>

// 10. PATH DRAWING
// Animasi SVG path
<motion.path
  initial={{ pathLength: 0 }}
  animate={{ pathLength: 1 }}
  transition={{ duration: 2 }}
/>

// 11. ORCHESTRATION
// Mengatur timing animasi
<motion.div
  animate={{ x: 100 }}
  transition={{
    delay: 0.5,
    when: "beforeChildren",
    delayChildren: 0.3
  }}
/>

// 12. CUSTOM ANIMATIONS
// Membuat animasi kustom dengan useMotionValue dan useTransform
const x = useMotionValue(0);
const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);

<motion.div style={{ x, opacity }} />

// 13. DRAG WITH CONSTRAINTS
// Membatasi area drag
<motion.div
  drag
  dragConstraints={{
    top: -50,
    left: -50,
    right: 50,
    bottom: 50
  }}
  dragElastic={0.2}
  dragMomentum={false}
/>

// 14. GESTURE CALLBACKS
// Menangani event gesture
<motion.div
  onHoverStart={(event, info) => {}}
  onHoverEnd={(event, info) => {}}
  onTapStart={(event, info) => {}}
  onTap={(event, info) => {}}
  onTapEnd={(event, info) => {}}
  onDragStart={(event, info) => {}}
  onDrag={(event, info) => {}}
  onDragEnd={(event, info) => {}}
/>

// 15. REUSABLE COMPONENTS
// Membuat komponen animasi yang bisa digunakan ulang
const AnimatedButton = ({ children }) => (
  <motion.button
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
    transition={{ type: "spring", stiffness: 400, damping: 17 }}
  >
    {children}
  </motion.button>
);
```
