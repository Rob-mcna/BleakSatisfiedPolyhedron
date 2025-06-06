function showPopup(content, x, y) {
  const popup = document.getElementById('popup');
  popup.innerHTML = content;
  popup.style.display = 'block';
  popup.style.left = x + 'px';
  popup.style.top = y + 'px';
  popup.focus();
}
function hidePopup() {
  document.getElementById('popup').style.display = 'none';
}