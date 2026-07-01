const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');",
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');\n@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap');"
);

css = css.replace(
  /body\s*\{\s*font-family:\s*'Montserrat',\s*sans-serif;\s*\}/,
  "body {\n  font-family: 'Inter', sans-serif;\n  background: #F0EDF8;\n  overflow-x: hidden;\n  min-height: 100vh;\n}"
);

const additions = `
/* Glass chip */
.glass-chip {
  backdrop-filter: blur(8px);
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.20);
}

/* Avatar group border */
.avatar-ring {
  border: 2px solid #702c91;
}

/* Floating animation */
@keyframes float {
  0%   { transform: translateY(0px); }
  50%  { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.animate-float {
  animation: float 6s ease-in-out infinite;
}
.animate-float-delay-1 {
  animation: float 6s ease-in-out 1s infinite;
}
.animate-float-delay-2 {
  animation: float 6s ease-in-out 2s infinite;
}

/* Input scale transition */
.input-wrapper {
  transition: transform 0.15s ease;
}
.input-wrapper:focus-within {
  transform: scale(1.01);
}

/* Gradient button */
.btn-gradient {
  background: linear-gradient(to right, #702c91 0%, #ec008c 50%, #702c91 100%);
  background-size: 200% auto;
  background-position: left center;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
.btn-gradient:hover {
  background-position: right center;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(91, 33, 182, 0.4);
}
.btn-gradient:active {
  transform: translateY(1px);
  box-shadow: 0 4px 10px rgba(91, 33, 182, 0.3);
}

/* Subtle shimmer on the left panel gradient */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

/* --- Global Animations --- */
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up {
  animation: fadeInUp 0.5s ease-out forwards;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

@keyframes slideInRight {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}
.animate-slide-in-right {
  animation: slideInRight 0.4s ease-out forwards;
}

.stagger-1 { animation-delay: 0.1s; opacity: 0; }
.stagger-2 { animation-delay: 0.2s; opacity: 0; }
.stagger-3 { animation-delay: 0.3s; opacity: 0; }
.stagger-4 { animation-delay: 0.4s; opacity: 0; }
.stagger-5 { animation-delay: 0.5s; opacity: 0; }

/* Interactive Hover States for Global Use */
.hover-scale {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}
.hover-scale:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 25px rgba(91, 33, 182, 0.1);
}

/* Hide scrollbar */
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

css += additions;

fs.writeFileSync('src/index.css', css);
console.log('CSS updated successfully.');
