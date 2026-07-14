'use client';

/* eslint-disable @typescript-eslint/restrict-template-expressions */

import { Suspense, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import styles from './styles.module.css';

type Variant = {
  id: number;
  name: string;
  kicker: string;
  accent: string;
};

const variants: Variant[] = [
  { id: 1, name: '温暖客厅', kicker: 'Warm lounge', accent: '#d78363' },
  { id: 2, name: '极简专注', kicker: 'Quiet focus', accent: '#252525' },
  { id: 3, name: '双栏工作台', kicker: 'Workbench', accent: '#516b5c' },
  { id: 4, name: '移动气泡', kicker: 'Mobile native', accent: '#6e5de7' },
  { id: 5, name: '时间轴', kicker: 'Timeline', accent: '#d05c4d' },
  { id: 6, name: '纸张信件', kicker: 'Paper letters', accent: '#a06b3d' },
  { id: 7, name: '终端陪伴', kicker: 'Terminal', accent: '#73f09b' },
  { id: 8, name: '杂志编辑部', kicker: 'Editorial', accent: '#ce3e75' },
  { id: 9, name: '浮岛', kicker: 'Floating islands', accent: '#3c83b9' },
  { id: 10, name: '窄轨侧栏', kicker: 'Narrow rail', accent: '#4e6b8c' },
  { id: 11, name: '顶部抽屉', kicker: 'Top drawer', accent: '#8e6b54' },
  { id: 12, name: '三段工作台', kicker: 'Three pane', accent: '#59715c' },
  { id: 13, name: '居中阅读', kicker: 'Reading column', accent: '#bf765d' },
  { id: 14, name: '底部 Dock', kicker: 'Bottom dock', accent: '#6955a6' },
  { id: 15, name: '气泡工作台', kicker: 'Bubble desk', accent: '#287f78' },
  { id: 16, name: '状态栏', kicker: 'Status bar', accent: '#c45747' },
  { id: 17, name: '卡片分栏', kicker: 'Card split', accent: '#71834e' },
  { id: 18, name: '无边界', kicker: 'Borderless', accent: '#334b61' },
];

const messages = [
  { role: 'ai', text: '晚上好。今天过得怎么样？我在这里。' },
  { role: 'user', text: '有点累，但终于把最难的事情推进了一点。' },
  { role: 'ai', text: '那值得被记下来。不是完成全部，而是让事情向前移动。' },
];

function MessageStack({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? styles.messagesCompact : styles.messages}>
      {messages.map((message, index) => (
        <div key={`${message.role}-${index}`} className={`${styles.message} ${message.role === 'user' ? styles.userMessage : styles.aiMessage}`}>
          <span className={styles.messageRole}>{message.role === 'ai' ? 'mw' : 'you'}</span>
          <p>{message.text}</p>
          <time>{index === 0 ? '21:08' : index === 1 ? '21:09' : '21:09'}</time>
        </div>
      ))}
    </div>
  );
}

function Composer({ label = '写点什么…' }: { label?: string }) {
  return <div className={styles.composer}><span>{label}</span><button aria-label="发送">↑</button></div>;
}

function Header({ title = 'mindweft' }: { title?: string }) {
  return <header className={styles.header}><span className={styles.logo}>✳</span><strong>{title}</strong><span className={styles.headerMeta}>private / online</span><button className={styles.iconButton}>···</button></header>;
}

function VariantOne() {
  return <main className={`${styles.canvas} ${styles.v1}`}><Header /><section className={styles.lounge}><div className={styles.greeting}><span>WEDNESDAY, JUL 14</span><h1>今晚想聊点什么？</h1><p>这里是只属于你们的安静角落。</p></div><MessageStack /><Composer /></section></main>;
}

function VariantTwo() {
  return <main className={`${styles.canvas} ${styles.v2}`}><div className={styles.focusTop}><span>mindweft / 01</span><span>22:14</span></div><div className={styles.focusBody}><div className={styles.focusMark}>✳</div><h1>一个空白，<br />等你写下第一句。</h1><MessageStack compact /><Composer label="Message mindweft" /></div></main>;
}

function VariantThree() {
  return <main className={`${styles.canvas} ${styles.v3}`}><aside className={styles.sidebar}><div className={styles.sidebarLogo}>mw<span>·</span></div><button className={styles.newChat}>＋ 新对话</button><span className={styles.sideLabel}>最近对话</span><div className={styles.sideItemActive}>今天的晚上 <small>现在</small></div><div className={styles.sideItem}>关于下周计划 <small>昨天</small></div><div className={styles.sideItem}>随便聊聊 <small>7月12日</small></div><div className={styles.sidebarBottom}>⚙ Provider 设置</div></aside><section className={styles.workbench}><Header title="今天的晚上" /><div className={styles.workbenchInner}><MessageStack /><Composer /></div></section></main>;
}

function VariantFour() {
  return <main className={`${styles.canvas} ${styles.v4}`}><div className={styles.phoneTop}><span>9:41</span><span>⌁ 100%</span></div><div className={styles.phoneTitle}><span className={styles.avatar}>✳</span><div><strong>mindweft</strong><small>陪你聊会儿</small></div><button>•••</button></div><div className={styles.phoneMessages}><MessageStack /></div><Composer label="输入消息" /></main>;
}

function VariantFive() {
  return <main className={`${styles.canvas} ${styles.v5}`}><Header title="对话时间轴" /><div className={styles.timeline}><div className={styles.timelineDate}>今天 · 7月14日</div><MessageStack /><div className={styles.timelineNote}>— 这段对话会成为你们共同的时间线 —</div></div><Composer label="继续这段对话…" /></main>;
}

function VariantSix() {
  return <main className={`${styles.canvas} ${styles.v6}`}><div className={styles.paperNav}><span>mindweft</span><span>第 001 封信</span><span>保存至记忆　↗</span></div><div className={styles.letter}><span className={styles.letterDate}>2026.07.14　星期三</span><h1>给今天的你</h1><MessageStack compact /><Composer label="写回信…" /></div></main>;
}

function VariantSeven() {
  return <main className={`${styles.canvas} ${styles.v7}`}><div className={styles.terminalBar}><span>● ● ●</span><span>mindweft — companion</span><span>⌘K</span></div><div className={styles.terminalBody}><p><i>mindweft</i> <span>~</span> ready</p><p className={styles.dim}>// private conversation · no telemetry</p><MessageStack compact /><Composer label="> 输入消息" /></div></main>;
}

function VariantEight() {
  return <main className={`${styles.canvas} ${styles.v8}`}><Header title="THE DAILY WEFT" /><div className={styles.editorialHead}><span>ISSUE 014 · PERSONAL EDITION</span><h1>你今天<br /><em>向前了一点</em></h1><p>一场没有观众的对话，也值得被认真对待。</p></div><div className={styles.editorialChat}><MessageStack compact /><Composer label="写下下一段…" /></div></main>;
}

function VariantNine() {
  return <main className={`${styles.canvas} ${styles.v9}`}><div className={styles.islandTop}><span className={styles.logo}>✳</span><span>mindweft</span><button>设置</button></div><div className={styles.island}><div className={styles.islandTitle}><span>今晚的陪伴</span><small>刚刚在线</small></div><MessageStack compact /><Composer label="和 mindweft 说话" /></div><div className={styles.miniIsland}>今天的心情？ <span>＋</span></div></main>;
}

function DeskVariant({ className, title, eyebrow, sidebar }: { className: string; title: string; eyebrow: string; sidebar: string[] }) {
  return <main className={`${styles.canvas} ${styles.deskVariant} ${className}`}><aside className={styles.deskRail}><div className={styles.deskBrand}>✳ <span>mindweft</span></div><div className={styles.deskEyebrow}>{eyebrow}</div>{sidebar.map((item) => <div className={styles.deskLink} key={item}>{item}</div>)}<div className={styles.deskSpacer} /><div className={styles.deskLink}>⚙ Provider</div></aside><section className={styles.deskMain}><div className={styles.deskHeader}><div><small>{eyebrow}</small><h1>{title}</h1></div><button>•••</button></div><div className={styles.deskMessages}><MessageStack compact /></div><Composer /></section></main>;
}

function VariantTen() { return <DeskVariant className={styles.deskVariant ?? ''} title="今晚的对话" eyebrow="WED · 14 JUL" sidebar={['今天的晚上', '周末计划', '随便聊聊']} />; }
function VariantEleven() { return <main className={`${styles.canvas} ${styles.v11}`}><div className={styles.drawerTop}><span>☰</span><strong>今天的晚上</strong><span>设置</span></div><div className={styles.drawerBody}><div className={styles.drawerPeek}>最近对话<br /><small>今天的晚上 · 周末计划 · 随便聊聊</small></div><MessageStack /><Composer /></div></main>; }
function VariantTwelve() { return <main className={`${styles.canvas} ${styles.v12}`}><aside className={styles.threeLeft}><b>mw</b><span>✦</span><span>◌</span><span>⌁</span><span>⚙</span></aside><aside className={styles.threeMiddle}><strong>对话</strong><div className={styles.threeActive}>今天的晚上</div><div>周末计划</div><div>随便聊聊</div></aside><section className={styles.threeChat}><Header title="今天的晚上" /><div><MessageStack compact /><Composer /></div></section></main>; }
function VariantThirteen() { return <main className={`${styles.canvas} ${styles.v13}`}><Header title="mindweft" /><div className={styles.readingColumn}><div className={styles.readingMeta}>TODAY / PRIVATE / 21:08</div><h1>今天的晚上</h1><MessageStack compact /><Composer /></div></main>; }
function VariantFourteen() { return <main className={`${styles.canvas} ${styles.v14}`}><div className={styles.dockHeader}><span>mindweft</span><span>今天的晚上</span><span>⌘</span></div><div className={styles.dockChat}><MessageStack compact /></div><div className={styles.dock}><span className={styles.dockSelected}>今天</span><span>历史</span><span>记忆</span><span>设置</span><Composer label="写消息…" /></div></main>; }
function VariantFifteen() { return <main className={`${styles.canvas} ${styles.v15}`}><div className={styles.bubbleSide}><span>✳</span><b>对话</b><div>今天的晚上</div><div>周末计划</div><div>随便聊聊</div></div><div className={styles.bubbleDesk}><div className={styles.bubbleTitle}><span>今天的晚上</span><small>一个温柔的空间</small></div><div className={styles.bubbleMessages}><MessageStack compact /></div><Composer label="输入一句话…" /></div></main>; }
function VariantSixteen() { return <main className={`${styles.canvas} ${styles.v16}`}><div className={styles.statusLine}><span><i /> ONLINE</span><span>今天的晚上</span><span>14 / 07 / 26</span></div><div className={styles.statusLayout}><aside><strong>CONVERSATIONS</strong><div className={styles.statusActive}>今天的晚上</div><div>周末计划</div><div>随便聊聊</div></aside><section><MessageStack compact /><Composer label="WRITE TO MW_" /></section></div></main>; }
function VariantSeventeen() { return <main className={`${styles.canvas} ${styles.v17}`}><div className={styles.cardTop}><span className={styles.logo}>✳</span><span>今天的晚上</span><button>切换对话</button></div><div className={styles.cardGrid}><div className={styles.contextCard}><small>CONTEXT</small><h2>你正在和<br />mindweft 聊天</h2><p>私人、连续、只属于你。</p></div><div className={styles.chatCard}><MessageStack compact /><Composer /></div></div></main>; }
function VariantEighteen() { return <main className={`${styles.canvas} ${styles.v18}`}><div className={styles.borderlessTop}><span>mindweft</span><span>今天的晚上</span><span>⌁</span></div><div className={styles.borderlessBody}><aside><div className={styles.borderlessActive}>今天的晚上</div><div>周末计划</div><div>随便聊聊</div></aside><section><MessageStack compact /><Composer /></section></div></main>; }

function PrototypeSwitcher({ current, device }: { current: number; device: 'desktop' | 'mobile' }) {
  const router = useRouter();
  const pathname = usePathname();
  const change = (next: number) => { router.replace(`${pathname}?variant=${String(next)}`); };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(document.activeElement?.tagName ?? '')) return;
      if (event.key === 'ArrowLeft') { change(current === 1 ? 18 : current - 1); }
      if (event.key === 'ArrowRight') { change(current === 18 ? 1 : current + 1); }
    };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); };
  });
  const item = variants.find((variant) => variant.id === current) ?? { id: 1, name: '温暖客厅', kicker: 'Warm lounge', accent: '#d78363' };
  const toggleDevice = (next: 'desktop' | 'mobile') => { router.replace(`${pathname}?variant=${String(current)}&device=${next}`); };
  return <nav className={styles.switcher} aria-label="Prototype variants"><button onClick={() => { change(current === 1 ? 18 : current - 1); }}>←</button><span><b>{String(item.id)}</b> / {item.name}<small>{item.kicker}</small></span><select value={current} onChange={(event) => { change(Number(event.target.value)); }}>{variants.map((variant) => <option key={variant.id} value={variant.id}>{variant.id} — {variant.name}</option>)}</select><div className={styles.deviceToggle}><button className={device === 'desktop' ? styles.deviceSelected : ''} onClick={() => { toggleDevice('desktop'); }}>桌面</button><button className={device === 'mobile' ? styles.deviceSelected : ''} onClick={() => { toggleDevice('mobile'); }}>手机</button></div><button onClick={() => { change(current === 18 ? 1 : current + 1); }}>→</button></nav>;
}

function ChatPrototypeContent() {
  const searchParams = useSearchParams();
  const raw = Number(searchParams.get('variant') ?? '1');
  const current = Number.isInteger(raw) && raw >= 1 && raw <= 18 ? raw : 1;
  const device = searchParams.get('device') === 'mobile' ? 'mobile' : 'desktop';
  const Page = [VariantOne, VariantTwo, VariantThree, VariantFour, VariantFive, VariantSix, VariantSeven, VariantEight, VariantNine, VariantTen, VariantEleven, VariantTwelve, VariantThirteen, VariantFourteen, VariantFifteen, VariantSixteen, VariantSeventeen, VariantEighteen][current - 1] ?? VariantOne;
  return <div className={device === 'mobile' ? styles.mobilePreview : ''}><Page /><PrototypeSwitcher current={current} device={device} /></div>;
}

export default function ChatPrototypePage() {
  return <Suspense fallback={<main className={styles.canvas}>Loading prototype…</main>}><ChatPrototypeContent /></Suspense>;
}
