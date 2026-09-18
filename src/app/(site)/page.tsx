import { HomeFanpage } from '@/components/site/fanpage/home-fanpage';
import { HomeGrid } from '@/components/site/home/home-grid';
import { HomeMagazine } from '@/components/site/home/home-magazine';
import { HomeToday } from '@/components/site/home/home-today';
import { getHomeData } from '@/components/site/home/home-data';
import { getActiveTheme } from '@/lib/theme-server';
import { MissedBox } from '@/components/site/missed-box';

export default async function HomePage() {
  const { theme } = await getActiveTheme();
  const data = await getHomeData();
  const home = theme.homeLayout === 'fanpage' ? <HomeFanpage d={data} /> : theme.homeLayout === 'grid' ? <HomeGrid d={data} /> : theme.homeLayout === 'magazine' ? <HomeMagazine d={data} /> : <HomeToday d={data} />;
  return <><MissedBox />{home}</>;
}
