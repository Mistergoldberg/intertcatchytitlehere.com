function toggleMenu(){
  document.getElementById('side-menu')?.classList.toggle('open');
}

// Close menu with ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('side-menu')?.classList.remove('open');
  }
});

// Close menu by clicking outside the links (the dark backdrop)
document.addEventListener('click', (e) => {
  const menu = document.getElementById('side-menu');
  if (!menu) return;
  const links = menu.querySelector('.menu-links');
  if (menu.classList.contains('open') && e.target === menu) {
    menu.classList.remove('open');
  }
});
