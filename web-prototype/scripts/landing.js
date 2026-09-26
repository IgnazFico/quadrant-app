// ===========================
// QUADRANT — LANDING PAGE JS
// ===========================

// Feature tabs
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab)?.classList.add('active');
  });
});

// Sticky header shadow
window.addEventListener('scroll', () => {
  const header = document.getElementById('site-header');
  if (!header) return;
  header.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.07)' : 'none';
});

// Reveal animations on scroll (for sections below fold)
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.evidence-grid, .paradigm-table, .feature-tabs').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(24px)';
  el.style.transition = 'opacity 0.7s ease, transform 0.7s ease';
  observer.observe(el);
});
