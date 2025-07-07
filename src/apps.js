import { runPluginApp } from './pluginApi.js';
import fs from './fs.js';

export function createApp(id, cont, win) {
  if (runPluginApp(id, cont, win)) return;
  switch (id) {
    case 'term': {
      const pre = document.createElement('pre');
      pre.textContent = 'Terminal >';
      const inp = document.createElement('input');
      const history = [];
      let hIndex = 0;
      inp.placeholder = 'escribe y pulsa Enter';

      function runCmd(cmd) {
        const [c, ...args] = cmd.split(' ');
        try {
          switch (c) {
            case 'help':
              pre.textContent += '\nComandos: help, echo, date, clear, ls, cat, write, mkdir';
              break;
            case 'echo':
              pre.textContent += '\n' + args.join(' ');
              break;
            case 'date':
              pre.textContent += '\n' + new Date().toString();
              break;
            case 'clear':
              pre.textContent = 'Terminal >';
              break;
            case 'ls': {
              const list = fs.ls(args[0] || '/');
              pre.textContent += '\n' + list.join(' ');
              break;
            }
            case 'cat':
              pre.textContent += '\n' + fs.cat(args[0]);
              break;
            case 'write': {
              const [file, ...text] = args;
              fs.write(file, text.join(' '));
              break;
            }
            case 'mkdir':
              fs.mkdir(args[0]);
              break;
            default:
              if (c) pre.textContent += `\nComando desconocido: ${c}`;
          }
        } catch (e) {
          pre.textContent += '\n' + e.message;
        }
      }

      inp.onkeydown = e => {
        if (e.key === 'Enter') {
          pre.textContent += `\n$ ${inp.value}`;
          runCmd(inp.value.trim());
          history.push(inp.value);
          hIndex = history.length;
          inp.value = '';
          cont.scrollTop = cont.scrollHeight;
        } else if (e.key === 'ArrowUp') {
          if (hIndex > 0) { hIndex--; inp.value = history[hIndex] || ''; e.preventDefault(); }
        } else if (e.key === 'ArrowDown') {
          if (hIndex < history.length - 1) { hIndex++; inp.value = history[hIndex] || ''; e.preventDefault(); }
          else { hIndex = history.length; inp.value = ''; e.preventDefault(); }
        }
      };
      cont.append(pre, inp);
      break;
    }
    case 'edit': {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;height:100%';
      const ta = document.createElement('textarea');
      ta.style.flex = '1';
      ta.value = 'Escribe aquí…';
      const save = document.createElement('button');
      save.textContent = 'Guardar';
      save.onclick = () => {
        const blob = new Blob([ta.value], { type: 'text/plain' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'texto.txt';
        a.click();
        URL.revokeObjectURL(a.href);
        if (window.showToast) window.showToast('Archivo guardado');
      };
      wrap.append(ta, save);
      cont.appendChild(wrap);
      break;
    }
    case 'web': {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;height:100%';
      const bar = document.createElement('input');
      bar.placeholder = 'https://...';
      bar.style.marginBottom = '6px';
      const iframe = document.createElement('iframe');
      iframe.style.flex = '1';
      iframe.src = 'https://example.com';
      bar.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          const url = bar.value.startsWith('http') ? bar.value : `https://${bar.value}`;
          iframe.src = url;
        }
      });
      wrap.append(bar, iframe);
      cont.appendChild(wrap);
      break;
    }
    case 'clock': {
      const clock = document.createElement('div');
      clock.style.cssText = 'font-size:2rem;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%';
      const tEl = document.createElement('div');
      const dEl = document.createElement('div');
      dEl.style.fontSize = '1.2rem';
      const update = () => {
        const now = new Date();
        tEl.textContent = now.toLocaleTimeString();
        dEl.textContent = now.toLocaleDateString();
      };
      update();
      win.interval = setInterval(update, 1000);
      clock.append(tEl, dEl);
      cont.appendChild(clock);
      break;
    }
    case 'calc': {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'display:flex;flex-direction:column;height:100%';
      const inp = document.createElement('input');
      inp.placeholder = 'Ej. 2+2*3';
      inp.style.marginBottom = '6px';
      const res = document.createElement('pre');
      res.style.flex = '1';
      res.textContent = '';
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          let out;
          try { out = new Function('return ' + inp.value)(); }
          catch {
            out = 'Error';
            if (window.showToast) window.showToast('Expresi\u00f3n inv\u00e1lida');
          }
          res.textContent += `${inp.value} = ${out}\n`;
          inp.value = '';
          res.scrollTop = res.scrollHeight;
        }
      });
      wrap.append(inp, res);
      cont.appendChild(wrap);
      break;
    }
    case 'settings': {
      cont.style.display = 'flex';
      cont.style.flexDirection = 'column';
      cont.style.gap = '10px';

      const themeSel = document.createElement('select');
      themeSel.innerHTML = '<option value="light">Claro</option><option value="dark">Oscuro</option>';
      themeSel.value = window.PREFS.theme;
      themeSel.onchange = () => { window.PREFS.theme = themeSel.value; window.applyTheme(themeSel.value); window.savePrefs(); };

      const wallSel = document.createElement('select');
      wallSel.innerHTML = '<option value="default">Azul</option><option value="sunset">Atardecer</option><option value="forest">Bosque</option>';
      wallSel.value = window.PREFS.wallpaper;
      wallSel.onchange = () => { window.PREFS.wallpaper = wallSel.value; window.applyWallpaper(wallSel.value); window.savePrefs(); };

      const langSel = document.createElement('select');
      langSel.innerHTML = '<option value="es">Español</option><option value="en">English</option>';
      langSel.value = window.PREFS.lang;
      langSel.onchange = () => { window.PREFS.lang = langSel.value; window.applyLang(langSel.value); window.savePrefs(); };

      const contrastSel = document.createElement('select');
      contrastSel.innerHTML = '<option value="normal">Normal</option><option value="high">Alto</option>';
      contrastSel.value = window.PREFS.contrast;
      contrastSel.onchange = () => { window.PREFS.contrast = contrastSel.value; window.applyContrast(contrastSel.value); window.savePrefs(); };

      cont.append('Tema:', themeSel, 'Fondo:', wallSel, 'Idioma:', langSel, 'Contraste:', contrastSel);
      break;
    }
  }
}
