-- Seed categories
insert into public.categories (name, slug, description, sort_order) values
  ('Sealed', 'sealed', 'Booster boxes, packs, and sealed collections', 1),
  ('Singles', 'singles', 'Individual Pokémon cards', 2),
  ('Graded', 'graded', 'PSA, BGS, and CGC graded cards', 3),
  ('Bundles', 'bundles', 'Curated card bundles and lots', 4);

-- Seed products
insert into public.products (name, slug, description, short_description, price, sku, stock, category_id, featured, images, attributes) values
  (
    'Pokémon TCG: Scarlet & Violet Base Set Booster Box',
    'scarlet-violet-booster-box',
    '<p>Contains 36 booster packs from the Scarlet & Violet Base Set series. Each pack contains 10 cards and 1 Basic Energy.</p><p>Release Date: March 31, 2023</p>',
    '36 booster packs per box. The latest Scarlet & Violet era!',
    179.99, 'SV-BB-001', 15, 1, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=SV+Booster+Box","alt":"Scarlet & Violet Booster Box"}]'::jsonb,
    '{"set":"Scarlet & Violet Base Set","pack_count":"36","release_date":"2023-03-31","era":"Scarlet & Violet"}'::jsonb
  ),
  (
    'Charizard VMAX (Darkness Ablaze) - PSA 10',
    'charizard-vmax-darkness-ablaze-psa10',
    '<p>Charizard VMAX from Darkness Ablaze graded PSA Gem Mint 10. One of the most sought-after modern cards.</p>',
    'Charizard VMAX PSA 10 - Darkness Ablaze. Ultra rare graded gem.',
    599.99, 'GRD-CD-001', 2, 3, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Charizard+VMAX+PSA10","alt":"Charizard VMAX PSA 10"}]'::jsonb,
    '{"set":"Darkness Ablaze","card_number":"189/189","grade":"PSA 10","rarity":"Ultra Rare"}'::jsonb
  ),
  (
    'Eeveelution Collection Bundle',
    'eeveelution-collection-bundle',
    '<p>A curated bundle featuring all 8 Eeveelutions in Near Mint condition. Includes: Vaporeon, Jolteon, Flareon, Espeon, Umbreon, Leafeon, Glaceon, and Sylveon.</p>',
    'All 8 Eeveelutions in Near Mint condition. Complete your collection!',
    89.99, 'BND-EEV-001', 10, 4, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Eeveelution+Bundle","alt":"Eeveelution Bundle"}]'::jsonb,
    '{"cards":"8","condition":"Near Mint","includes":"Vaporeon, Jolteon, Flareon, Espeon, Umbreon, Leafeon, Glaceon, Sylveon"}'::jsonb
  ),
  (
    'Umbreon VMAX (Evolving Skies) - NM',
    'umbreon-vmax-evolving-skies',
    '<p>Umbreon VMAX from Evolving Skies (Alternate Art). Near Mint condition. The most valuable modern Pokémon card.</p>',
    'Umbreon VMAX Alt Art - Evolving Skies. Near Mint condition.',
    749.99, 'SGL-ES-001', 1, 2, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Umbreon+VMAX","alt":"Umbreon VMAX Evolving Skies"}]'::jsonb,
    '{"set":"Evolving Skies","card_number":"215/203","condition":"Near Mint","rarity":"Secret Rare"}'::jsonb
  ),
  (
    'Pokémon TCG: 151 Booster Bundle',
    'pokemon-151-booster-bundle',
    '<p>6 booster packs from the special Pokémon 151 set. Celebrating the original 151 Pokémon!</p>',
    '6 packs of Pokémon 151. Relive the original Kanto adventure!',
    54.99, 'SV-151-BB-001', 25, 1, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=151+Bundle","alt":"Pokemon 151 Booster Bundle"}]'::jsonb,
    '{"set":"Scarlet & Violet - 151","pack_count":"6","release_date":"2023-09-22","era":"Scarlet & Violet"}'::jsonb
  ),
  (
    'Rayquaza VMAX (Evolving Skies) - PSA 9',
    'rayquaza-vmax-evolving-skies-psa9',
    '<p>Rayquaza VMAX Alternate Art from Evolving Skies graded PSA Mint 9. Stunning card featuring the legendary Sky High Pokémon.</p>',
    'Rayquaza VMAX Alt Art PSA 9. Legendary Sky High Pokémon.',
    349.99, 'GRD-RV-001', 3, 3, true,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Rayquaza+VMAX+PSA9","alt":"Rayquaza VMAX PSA 9"}]'::jsonb,
    '{"set":"Evolving Skies","card_number":"218/203","grade":"PSA 9","rarity":"Secret Rare"}'::jsonb
  ),
  (
    'Darkness Ablaze Booster Pack (x10)',
    'darkness-ablaze-booster-pack-10',
    '<p>10 booster packs from the Darkness Ablaze set. Features powerful Darkness-type Pokémon including Eternatus VMAX and Charizard VMAX.</p>',
    '10 packs of Darkness Ablaze. Chase that Charizard VMAX!',
    39.99, 'SGL-DA-10', 50, 1, false,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Darkness+Ablaze","alt":"Darkness Ablaze Packs"}]'::jsonb,
    '{"set":"Darkness Ablaze","pack_count":"10","release_date":"2020-08-14"}'::jsonb
  ),
  (
    'Vintage Binder Collection (WOTC)',
    'vintage-binder-collection-wotc',
    '<p>A collection of 20 vintage cards from the Wizards of the Coast era (Base Set through Neo Destiny). Includes holos and rares. Conditions range from LP to NM.</p>',
    '20 vintage WOTC cards. Base Set through Neo Destiny.',
    199.99, 'BND-VIN-001', 5, 4, false,
    '[{"src":"https://placehold.co/600x600/1a1a2e/d4a84b?text=Vintage+Collection","alt":"Vintage Collection"}]'::jsonb,
    '{"cards":"20","era":"WOTC (Base Set - Neo)","condition":"LP to NM","includes":"Holos and Rares"}'::jsonb
  );
