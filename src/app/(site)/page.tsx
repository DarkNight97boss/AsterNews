import { HomeGrid } from '@/components/site/home/home-grid';
import { HomeMagazine } from '@/components/site/home/home-magazine';
import { HomeToday } from '@/components/site/home/home-today';
import { getHomeData } from '@/components/site/home/home-data';
import { getActiveTheme } from '@/lib/theme-server';

export default async function HomePage() {
  const { theme } = await getActiveTheme();
  const data = getHomeData();
  if (theme.homeLayout === 'grid') return <HomeGrid d={data} />;
  if (theme.homeLayout === 'magazine') return <HomeMagazine d={data} />;
  return <HomeToday d={data} />;
}
