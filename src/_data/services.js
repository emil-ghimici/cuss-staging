// The six services. Order is the order used everywhere (Services panel, Menu, footer, home cards).
// `talk` finishes "Talk to us about …". `chip` is the "What do you need?" option that service pages pre-tick.
export default [
  { slug: 'custom-software', talk: 'custom web apps', name: 'Custom web apps & internal tools', short: 'Custom apps', icon: 'app-window',
    summary: 'One place for the jobs now spread across spreadsheets and email.', chip: 'A custom app' },
  { slug: 'automation', talk: 'automation', name: 'Automation', short: 'Automation', icon: 'workflow',
    summary: 'Let the software do the retyping, chasing and copying.', chip: 'Automate a task' },
  { slug: 'dashboards', talk: 'dashboards & reports', name: 'Dashboards & reports', short: 'Dashboards', icon: 'chart-column',
    summary: 'See how the business is doing without building the report yourself.', chip: 'Dashboards & reports' },
  { slug: 'websites', talk: 'websites', name: 'Websites', short: 'Websites', icon: 'globe',
    summary: 'Fast, clear websites that bring in enquiries.', chip: 'A website' },
  { slug: 'cloud-it-consulting', talk: 'cloud & IT', name: 'Cloud & IT consulting', short: 'Cloud & IT', icon: 'cloud',
    summary: 'Email, backups, Microsoft 365 and the rest, set up properly.', chip: 'Cloud / IT help' },
  { slug: 'ai-data', talk: 'AI & data', name: 'AI & data projects', short: 'AI & data', icon: 'sparkle',
    summary: 'Practical AI for real tasks, with a partner team for bigger data work.', chip: 'AI or data project' },
];
