export function createApp(id, cont, win) {
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
        switch (c) {
          case 'help':
            pre.textContent += '\nComandos: help, echo, date, clear';
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
          default:
            if (c) pre.textContent += `\nComando desconocido: ${c}`;
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
          catch { out = 'Error'; }
          res.textContent += `${inp.value} = ${out}\n`;
          inp.value = '';
          res.scrollTop = res.scrollHeight;
        }
      });
      wrap.append(inp, res);
      cont.appendChild(wrap);
      break;
    }
  }
}
