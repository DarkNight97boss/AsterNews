import { describe, expect, it } from 'vitest';
import { cleanWpContent, parseWxrItem } from '../src/lib/wp-import';

const item = `<item>
<title>Incendio in un capannone, nessun ferito</title>
<link>https://www.vecchiomagazine.it/cronaca/incendio-capannone.html</link>
<dc:creator><![CDATA[mrossi]]></dc:creator>
<content:encoded><![CDATA[<!-- wp:paragraph --><p>Un incendio è divampato nella notte.</p><!-- /wp:paragraph -->[caption id="1"]<img src="https://www.vecchiomagazine.it/wp-content/uploads/a.jpg" alt="" />[/caption]<p>Nessun ferito.</p>]]></content:encoded>
<excerpt:encoded><![CDATA[Le fiamme domate in quattro ore.]]></excerpt:encoded>
<wp:post_id>101</wp:post_id><wp:post_date>2025-03-03 09:15:00</wp:post_date><wp:post_name>incendio-capannone</wp:post_name><wp:status>publish</wp:status><wp:post_type>post</wp:post_type>
<category domain="category" nicename="cronaca"><![CDATA[Cronaca]]></category>
<category domain="post_tag" nicename="vigili-del-fuoco"><![CDATA[Vigili del fuoco]]></category>
<wp:postmeta><wp:meta_key>_thumbnail_id</wp:meta_key><wp:meta_value>55</wp:meta_value></wp:postmeta>
</item>`;

describe('importazione WordPress', () => {
  it('legge un item WXR con categorie, tag, stato e immagine in evidenza', () => {
    const p = parseWxrItem(item, new Map([['55', 'https://www.vecchiomagazine.it/wp-content/uploads/cover.jpg']]));
    expect(p).not.toBeNull();
    expect(p!.wpId).toBe('101');
    expect(p!.title).toContain('Incendio');
    expect(p!.slug).toBe('incendio-capannone');
    expect(p!.status).toBe('publish');
    expect(p!.categories).toContain('Cronaca');
    expect(p!.tags).toContain('Vigili del fuoco');
    expect(p!.image).toContain('cover.jpg');
  });
  it('pulisce i commenti Gutenberg e gli shortcode', () => {
    const html = cleanWpContent('<!-- wp:paragraph --><p>Testo</p><!-- /wp:paragraph -->[gallery ids="1,2"][caption]<img src="x.jpg" />[/caption]');
    expect(html).not.toContain('wp:paragraph');
    expect(html).not.toContain('[gallery');
    expect(html).toContain('<p>Testo</p>');
  });
});
