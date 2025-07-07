export default function(registerApp, manifest) {
  registerApp(manifest, (cont) => {
    const div = document.createElement('div');
    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'center';
    div.style.height = '100%';
    div.textContent = '¡Hola desde el plugin!';
    cont.appendChild(div);
  });
}
