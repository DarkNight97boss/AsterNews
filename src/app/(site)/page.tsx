import { HomeFanpage } from '@/components/site/fanpage/home-fanpage';
import { HomeGrid } from '@/components/site/home/home-grid';
import { HomeMagazine } from '@/components/site/home/home-magazine';
import { HomeToday } from '@/components/site/home/home-today';
import { getHomeData } from '@/components/site/home/home-data';
import { getActiveTheme } from '@/lib/theme-server';
import { MissedBox } from '@/components/site/missed-box';
import { getSettings } from '@/lib/queries';
import { listArticles } from '@/lib/repo';
import { homeFromActivity } from '@/lib/personal';
import { wordCount } from '@/lib/content-render';

export default async function HomePage() {
  const { theme } = await getActiveTheme();
  const data = await getHomeData();
  // Home che si compone dall'attività: se nelle ultime due settimane hai pubblicato soprattutto foto o soprattutto testi lunghi, la disposizione ti segue
  const personal = (await getSettings()).personal; const auto = personal?.autoHome && theme.homeLayout !== 'fanpage' ? homeFromActivity((await listArticles({ status: 'published', from: new Date(Date.now() - 14 * 86_400_000).toISOString() }, 'published', 20)).map((a) => ({ format: a.format, words: wordCount(a.content) }))) : null;
  const layout = auto ?? theme.homeLayout;
  const home = layout === 'fanpage' ? <HomeFanpage d={data} /> : layout === 'grid' ? <HomeGrid d={data} /> : layout === 'magazine' ? <HomeMagazine d={data} /> : <HomeToday d={data} />;
  return <><MissedBox />{home}</>;
}
