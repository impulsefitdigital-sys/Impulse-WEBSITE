// Mini-rendu Markdown pour les contenus saisis dans l'admin (blog, réalisations).
// Éléments sans classe, stylés par `.article-body`. Les titres commencent à <h2> :
// le titre de la page reste l'unique <h1>.
//   # Titre → h2 · ## → h3 · ### → h4 · - liste · **gras** · *italique*
//   [texte](/chemin) → lien interne uniquement (pas de lien externe ni javascript:)
export const renderMarkdown = (md: string) => {
  const lines = md.split(/\r?\n/);
  const out: JSX.Element[] = [];
  let listItems: string[] = [];
  const inline = (s: string) => s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\((\/[\w\-/#?=.%]*)\)/g, '<a href="$2">$1</a>');
  const flushList = () => {
    if (listItems.length) {
      out.push(<ul key={`ul-${out.length}`}>{listItems.map((it, i) => <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />)}</ul>);
      listItems = [];
    }
  };
  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) { flushList(); out.push(<h2 key={idx}>{line.slice(2)}</h2>); }
    else if (line.startsWith("## ")) { flushList(); out.push(<h3 key={idx}>{line.slice(3)}</h3>); }
    else if (line.startsWith("### ")) { flushList(); out.push(<h4 key={idx}>{line.slice(4)}</h4>); }
    else if (line.startsWith("- ")) { listItems.push(line.slice(2)); }
    else if (line.trim() === "") { flushList(); }
    else { flushList(); out.push(<p key={idx} dangerouslySetInnerHTML={{ __html: inline(line) }} />); }
  });
  flushList();
  return out;
};
