import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Embedded CSV data to avoid external dependencies
function getSongsData() {
  const csvData = `title,artist,summary,theme,core_feelings,access_ideas,visual,version_label,source,locale
Bohemian Rhapsody,Queen,"Operatic rock epic exploring guilt, fate, and freedom.",Drama & inner turmoil,"[""conflicted soul"", ""epic struggle"", ""wild release""]","[""Shift dynamics: tender intro, operatic middle, rock out safely."", ""Visualize cinematic inner battle."", ""Let final fade be resigned.""]",🎭⚡ Theatrical mask lightning bolt,,,
Let Me Live,Queen,Gospel-tinged plea for freedom and second chances.,Freedom & redemption,"[""pleading hope"", ""joyous release"", ""forgiveness""]","[""Blend rock and gospel feel; wide chorus smile."", ""Visualize breaking free into sun."", ""Support big belts safely.""]",☀️🎤 Choir and spotlight,,,
We Will Rock You,Queen,Stomping arena anthem of defiance and power.,Rebellion & unstoppable strength,"[""fight energy"", ""crowd unity"", ""swagger""]","[""Stomp/clap rhythm physically while singing."", ""Visualize stadium stamping feet together."", ""Keep grit safe on shouts.""]",👣🏟️ Stadium stomping feet,,,
Somebody to Love,Queen,Soulful gospel-rock plea for love and understanding.,Loneliness & yearning for love,"[""aching hope"", ""spiritual cry"", ""big yearning""]","[""Float tender verses then unleash big safe belts."", ""Visualize pleading in empty church or hall."", ""Let choir backing lift energy.""]",🙏🎶 Spotlight on empty stage,,,
Miss Celie's Blues (Sister),Quincy Jones,Tender blues invitation to connection and sisterhood.,Comfort & loving bond,"[""warm sisterhood"", ""gentle flirt"", ""homey joy""]","[""Keep phrasing smooth and cozy."", ""Visualize sharing tea and safe smiles."", ""Swing lightly with warmth.""]",☕💜 Sisters laughing together,,,
Maybe God Is Trying to Tell You Something,Quincy Jones,Powerful gospel-soul cry of awakening and divine message.,Spiritual wake-up & release,"[""soul fire"", ""divine call"", ""urgent release""]","[""Sing full gospel cry safely; let passion grow."", ""Visualize spirit shaking you awake."", ""Clap and move with music.""]",🔥🙌 Light breaking through clouds,,,
Creep,Radiohead,Alt-rock confession of alienation and longing for belonging.,Self-doubt & yearning,"[""insecurity"", ""ache"", ""angst""]","[""Start soft and fragile; explode safely in chorus."", ""Visualize standing apart from crowd wanting in."", ""Let raw emotion color but stay controlled.""]",😶‍🌫️💔 Shadow outsider alone,,,
Georgia on My Mind,Ray Charles,Tender soulful ode to deep love and nostalgic home.,Love & homesickness,"[""wistful warmth"", ""devotion"", ""memory comfort""]","[""Sing smooth and heartfelt; gentle blues runs."", ""Visualize quiet southern sunset and longing."", ""Keep tempo easy and rich.""]",🌅🎹 River sunset with piano,,,
Hit the Road Jack,Ray Charles,"Playful, sassy break-up warning with blues swing.",Defiance & playful goodbye,"[""sass"", ""freedom"", ""cheeky anger""]","[""Bounce groove with crisp diction and attitude."", ""Visualize waving goodbye at door."", ""Keep tone light but firm.""]",👋🚗 Door slam cartoon,,,
What'd I Say,Ray Charles,"Joyous, sensual R&B jam with call and response.",Joy & flirtation,"[""playful lust"", ""dance energy"", ""celebration""]","[""Engage playful improv safely; call-response feel."", ""Visualize live club dancing and flirting."", ""Keep riffs energetic but supported.""]",🎷🔥 Dance floor sax and smiles,,,
Trouble,Ray LaMontagne,Soulful folk confession of inner struggle and love's rescue.,Struggle & tender salvation,"[""aching honesty"", ""comfort"", ""hope""]","[""Sing husky but controlled; gentle falsetto touches."", ""Visualize darkness giving way to light through love."", ""Keep tempo intimate and steady.""]",🌧️🕯️ Candle in dark cabin,,,
Under the Bridge,Red Hot Chili Peppers,Melancholic alt-rock about loneliness and urban isolation.,Loneliness & quiet reflection,"[""urban ache"", ""longing for belonging"", ""wistful calm""]","[""Start whispery; rise to safe rock belt mid-song."", ""Visualize empty LA streets under bridge."", ""Keep verses intimate.""]",🌉🏙️ Empty bridge at dusk,,,
Losing My Religion,R.E.M.,Alt-rock lament of unrequited love and obsessive doubt.,Vulnerability & confusion,"[""yearning"", ""questioning faith"", ""emotional nakedness""]","[""Sing airy but strong, maintain calm dynamics."", ""Visualize wrestling feelings in secret room."", ""Lean into mandolin-like phrasing.""]",🙏💔 Cross shadow fading,,,
Seasons of Love,Rent,Broadway anthem counting love as life's true measure.,Love & shared humanity,"[""warmth"", ""community"", ""celebration""]","[""Blend ensemble feel or solo big notes safely."", ""Visualize friends arm in arm reflecting on year."", ""Smile openly while singing.""]",🕯️❤️ Group with candles,,,
Love on the Brain,Rihanna,Retro soul-pop about toxic but irresistible love.,Painful desire & surrender,"[""ache"", ""passion"", ""raw vulnerability""]","[""Channel grit safely on high belts; warm lower register."", ""Visualize begging lover despite pain."", ""Stay bluesy but controlled.""]",💋💔 Broken heart in neon,,,
Umbrella,Rihanna,Comforting pop-R&B promise of loyalty and protection.,Loyal love & shelter,"[""steadfast care"", ""comfort"", ""friendship""]","[""Keep chorus warm, chesty but not harsh."", ""Visualize holding umbrella over loved one."", ""Move gently with beat.""]",☂️🤍 Two under umbrella rain,,,
La Bamba,Ritchie Valens,Festive rock adaptation of Mexican folk dance song.,Joyful celebration & heritage,"[""fiesta energy"", ""pride"", ""dance""]","[""Bright and playful; clear Spanish diction."", ""Visualize dancing fiesta crowd."", ""Smile and move hips lightly.""]",🎉🇲🇽 Colorful guitars and dancers,,,
Tiger Striped Sky,Roo Panes,Gentle indie folk reflection on hope through struggles.,Quiet hope & wonder,"[""soft resilience"", ""nature wonder"", ""tender peace""]","[""Keep breathy gentle tone; intimate guitar feel."", ""Visualize open field sky shifting after storm."", ""Stay mellow and warm.""]",🌅🐅 Tiger striped clouds,,,
Junimond,Rio Reiser,Poetic German ballad of lost love and bittersweet summer night.,Lost love & nostalgia,"[""melancholy"", ""quiet longing"", ""tender memory""]","[""Sing hushed intimate German phrasing."", ""Visualize summer evening empty bench."", ""Keep chorus soft aching.""]",🌙🌼 Moonlit empty park bench,,,
Walk This Way,Run-DMC & Aerosmith,Groundbreaking rap-rock collab with playful swagger and lust.,Bold fun & fusion energy,"[""cheeky desire"", ""party"", ""crossover cool""]","[""Rap sharply then unleash rock shouts safely."", ""Visualize jam session breaking barriers."", ""Move with funk-rock groove.""]",🎸🎤 Split mic and guitar energy,,,
A Change Is Gonna Come,Sam Cooke,Soulful civil rights anthem full of hope after struggle.,Hope & perseverance,"[""resilience"", ""justice longing"", ""peaceful strength""]","[""Sing deeply but gently, heartfelt belts."", ""Visualize marching toward dawn of equality."", ""Let quiet pauses feel prayerful.""]",✊🏾🌅 Sunrise over marchers,,,
I'm Not the Only One,Sam Smith,Heartbreaking soul-pop about betrayal and infidelity.,Pain & quiet heartbreak,"[""sad discovery"", ""betrayal"", ""aching love""]","[""Float gentle hurt then cry on chorus safely."", ""Visualize finding painful truth quietly."", ""Keep falsetto controlled.""]",💔🕯️ Candle burning alone,,,
Stay with Me,Sam Smith,Gospel-tinged plea for love and not being alone tonight.,Loneliness & longing,"[""raw plea"", ""vulnerability"", ""fleeting comfort""]","[""Gentle verse intimacy, controlled gospel swell."", ""Visualize begging someone not to leave bed."", ""Keep sob quality safe.""]",🙌🛏️ Lonely night hands up,,,
Angel,Sarah McLachlan,Haunting ballad offering comfort in grief and despair.,Grief & gentle solace,"[""sorrow"", ""peace"", ""safe surrender""]","[""Float whisper-soft and still; minimal vibrato."", ""Visualize comforting grieving soul."", ""Keep support airy but stable.""]",🪽🕯️ Candle angel wings,,,
Kiss from a Rose,Seal,Mystical pop ballad celebrating deep transformative love.,Mystery & passionate devotion,"[""enchanted love"", ""awe"", ""haunting romance""]","[""Sing lush and open; don't oversqueeze highs."", ""Visualize rose blooming in snow."", ""Allow dramatic dynamic swells.""]",🌹❄️ Dark rose in storm,,,
Bogoroditse Devo,Sergei Rachmaninoff,"Sacred Russian choral prayer to Mother of God, serene and rich.",Sacred reverence & awe,"[""holy hush"", ""deep peace"", ""majestic devotion""]","[""Blend smooth Russian vowel lines; low resonance."", ""Visualize candlelit cathedral arches."", ""Stay reverent and controlled.""]",🕯️⛪ Cathedral candle glow,,,
A Bar Song (Tipsy),Shaboozey,Country-rap party anthem of letting loose and small-town nights.,Party & carefree joy,"[""rowdy fun"", ""escape"", ""drinking camaraderie""]","[""Sing/playful rap with swagger and twang."", ""Visualize lively bar night lights."", ""Keep groove bouncy.""]",🍻🤠 Neon bar and boots,,,
Good News,Shaboozey,Uplifting country-rap about resilience and brighter days ahead.,Optimism & bouncing back,"[""hopeful stride"", ""cheerful strength"", ""country pride""]","[""Smile in delivery; upbeat country flow."", ""Visualize sunrise after hard times."", ""Keep phrasing relaxed but proud.""]",🌅🏇 Cowboy riding into light,,,
Man! I Feel Like a Woman!,Shania Twain,Iconic country-pop empowerment anthem celebrating feminine joy.,Empowerment & playful rebellion,"[""sassy fun"", ""confidence"", ""freedom""]","[""Belt with safe twang and big smile."", ""Visualize wild girls' night out."", ""Dance and strut energy.""]",👠🎉 High heel kick,,,
Witness Me,"Shawn Mendes, Jacob Collier & Stormzy",Inspirational pop collab urging empathy and seeing each other.,Connection & uplifting unity,"[""hope"", ""friendship"", ""supportive love""]","[""Blend warm pop tone with choral lift."", ""Visualize crowd holding hands uplifted."", ""Let harmonies swell like wave.""]",🌍🤝 Hands joined under sky,,,
This Is My Life,Shirley Bassey,Powerhouse self-anthem claiming autonomy and resilience.,Self-determination & triumph,"[""bold pride"", ""survival"", ""dramatic strength""]","[""Start soft, unleash diva belt safely."", ""Visualize standing center stage defiant."", ""Let final note ring with power.""]",🌟🎤 Spotlight fierce pose,,,
Shosholoza,Traditional,South African traditional work song turned unity anthem.,Togetherness & hard work,"[""community"", ""strength"", ""movement""]","[""Sing call-response boldly but grounded."", ""Visualize railway workers pushing together."", ""Stomp rhythm naturally.""]",🚂🇿🇦 Train and unity dance,,,
Ol' Man River,Show Boat,Deep baritone lament of enduring hardship and flowing life.,Resilience & sorrow,"[""weariness"", ""quiet strength"", ""timeless struggle""]","[""Keep rich low resonance and legato lines."", ""Visualize mighty river carrying burdens."", ""Stay grounded and solemn.""]",🌊🚢 River with lone worker,,,
Way Maker,Sinach,Powerful worship anthem declaring God's promise and presence.,Faith & hope in darkness,"[""miracle hope"", ""comfort"", ""devotion""]","[""Sing gently then swell to strong worship cry."", ""Visualize light breaking into dark valley."", ""Smile through belief.""]",🌟🙏 Path of light through night,,,
Nothing Compares 2 U,Sinéad O'Connor,Haunting ballad of devastating heartbreak and empty loss.,Grief & lonely longing,"[""raw ache"", ""emptiness"", ""despair""]","[""Sing tender and exposed; safe chest cry on chorus."", ""Visualize empty rooms and absence."", ""Allow breathy fragility but support well.""]",🥀🌧️ Single tear on pale rose,,,
Bliss (I Am the Light of My Soul),Sirgun Kaur & Sat Darshan Singh,Meditative mantra affirming self-love and divine light.,Inner peace & spiritual self-worth,"[""calm joy"", ""radiant self-love"", ""tranquil flow""]","[""Keep tone airy, meditative and flowing."", ""Visualize glowing aura expanding from chest."", ""Breathe deeply, sustain long lines gently.""]",✨🕊️ Light radiating from heart,,,
Chandelier,Sia,Explosive pop about masking pain with party escape and addiction.,Desperation & fragile bravado,"[""wild abandon"", ""self-destruction"", ""hidden hurt""]","[""High belts but support strongly; don't push top notes."", ""Visualize swinging to numb pain."", ""Keep verses vulnerable and small.""]",💡🥂 Swinging chandelier and tears,,,
Cheap Thrills,Sia,Fun dance-pop about enjoying night out without fancy means.,Carefree joy & self-celebration,"[""playful freedom"", ""party energy"", ""budget fun""]","[""Light chest bounce and clear phrasing."", ""Visualize dancing with friends cheap night out."", ""Smile and groove easy.""]",💃🎶 Disco ball sparkle,,,
Hail Holy Queen,Sister Act,Joyful gospel remake of classic Marian hymn bursting with praise.,Exuberant faith & joy,"[""holy joy"", ""celebration"", ""sisterhood""]","[""Start reverent then gospel burst big but safe."", ""Visualize joyful choir swaying."", ""Clap rhythm to keep energy alive.""]",🙏🎹 Joyful nuns singing,,,
"Joyful, Joyful",Sister Act 2,High-energy gospel adaptation of Ode to Joy rejoicing in love and unity.,Celebration & gratitude,"[""uplift"", ""spirit fire"", ""communal joy""]","[""Blend smooth leads and choir bursts safely."", ""Visualize big graduation stage moment."", ""Clap and sway freely.""]",🎓🎶 Joyful dancing choir,,,
I'm Gonna Be (500 Miles),Sleeping At Last,Tender cover of love's promise to go any distance.,Devotion & gentle vow,"[""soft love"", ""promise"", ""hopeful journey""]","[""Sing calm and intimate; warm falsetto okay."", ""Visualize walking endless road toward beloved."", ""Keep gentle dynamic build.""]",🚶❤️ Path stretching far,,,
Chasing Cars,Snow Patrol,Intimate alt-rock ballad about pure love and being present.,Quiet love & safety,"[""safe stillness"", ""romantic devotion"", ""gentle vulnerability""]","[""Soft chest with breath support; restrained build."", ""Visualize lying in field with lover."", ""Let hush feel like comfort.""]",🌌💤 Two lying under stars,,,
Someday My Prince Will Come,Snow White and the Seven Dwarfs,Classic Disney waltz dreaming of love's arrival and hope.,Innocent longing & fairy tale hope,"[""gentle dreaming"", ""romantic hope"", ""nostalgic sweetness""]","[""Sing light, floaty and innocent."", ""Visualize castle dreams and woodland friends."", ""Keep phrasing graceful and sweet.""]",🏰🕊️ Fairytale castle at dawn,,,
Cranes in the Sky,Solange,Minimalist R&B catharsis trying to escape pain through distractions.,Numbness & quiet healing,"[""subtle sadness"", ""trying to cope"", ""gentle hope""]","[""Breathy restrained delivery; intimate tone."", ""Visualize cranes flying far from city."", ""Keep beat smooth and meditative.""]",🕊️🌇 Cranes flying from city,,,
Zip-a-Dee-Doo-Dah,Song of the South,Upbeat Disney tune celebrating simple joy and sunshine.,Optimism & playful delight,"[""sunny happiness"", ""childlike fun"", ""carefree cheer""]","[""Bounce lightly; smile in tone."", ""Visualize sunny meadow and birds."", ""Keep phrasing crisp and cheery.""]",☀️🐦 Bluebird and sunshine,,,
Some Enchanted Evening,South Pacific,Romantic show tune about life-changing love at first sight.,Romantic wonder & destiny,"[""swept away"", ""hopeful love"", ""dreamlike awe""]","[""Sing warm baritone/mezzo sustained lines."", ""Visualize moonlit tropical night."", ""Keep legato and gentle vibrato.""]",🌙🌺 Moonlit tropical dance,,,
2 Become 1,Spice Girls,Tender 90s pop plea for intimacy and connection.,Romantic closeness & sensual safety,"[""gentle love"", ""warm desire"", ""90s tenderness""]","[""Soft breathy start then bigger but safe chorus."", ""Visualize candlelit room with partner."", ""Keep phrasing silky and sweet.""]",💞🕯️ Candlelit embrace,,,
Wannabe,Spice Girls,Fun friendship pop anthem about loyalty and girl power.,Friendship & playful fun,"[""joy"", ""confidence"", ""group energy""]","[""Rap playful parts crisp; light safe belts."", ""Visualize dancing with best friends carefree."", ""Smile big and free.""]",👯🎉 Group dancing fun,,,
Power,Stefanie Heinzmann,Empowering pop-soul declaration of self-belief and rising strong.,Strength & personal victory,"[""confident energy"", ""growth"", ""joyful fight""]","[""Sing soulful but supported; strong chorus."", ""Visualize breaking chains and stepping forward."", ""Dance lightly while belting safe.""]",⚡💪 Radiant rising figure,,,
As,Stevie Wonder,Soulful eternal love song promising devotion forever.,Everlasting love & joy,"[""deep devotion"", ""hopeful promise"", ""warmth""]","[""Smooth sustained phrasing, bright soul belts."", ""Visualize seasons changing but love constant."", ""Smile inwardly through verses.""]",🌞♾️ Sun and infinity heart,,,
Faith (with Ariana Grande),Stevie Wonder,Upbeat pop-soul celebration of hope and dancing joy.,Joy & uplifting faith,"[""happy energy"", ""cheerful trust"", ""dance vibe""]","[""Bounce light pop-soul groove; crisp runs."", ""Visualize joyous dancing in sunshine."", ""Keep dynamic bright not strained.""]",☀️🕺 Dance floor joy,,,
I Just Called to Say I Love You,Stevie Wonder,Gentle pop-soul confession of love without occasion.,Simple love & sweet connection,"[""tender joy"", ""gratitude"", ""gentle romance""]","[""Keep easy crooner tone, minimal strain."", ""Visualize calling beloved just because."", ""Smile gently and sincerely.""]",☎️❤️ Phone with heart line,,,
I Wish,Stevie Wonder,Funky nostalgic joy recalling youthful days.,Nostalgia & playful groove,"[""childhood joy"", ""funky energy"", ""memory fun""]","[""Move with groove, light funky belts safe."", ""Visualize dancing through childhood scenes."", ""Keep articulation playful.""]",🕺🎹 Funky disco memories,,,
Living for the City,Stevie Wonder,Soul-funk protest narrative about systemic injustice and hope.,Struggle & resilience,"[""urban fight"", ""hope"", ""anger""]","[""Tell story with grit but controlled belts."", ""Visualize bustling unfair city streets."", ""Keep funk pocket strong.""]",🏙️✊ City street protest,,,
Superstition,Stevie Wonder,Funky cautionary groove about irrational fears and luck.,Mystery & funky warning,"[""funk"", ""playful caution"", ""cool groove""]","[""Syncopate crisp with clavinet feel; safe belts on hook."", ""Visualize funky shadowy streets."", ""Dance loose while singing.""]",🧙‍♂️🎹 Funky magic and groove,,,
Fields of Gold,Sting,Gentle romantic folk-pop recalling love in golden fields.,Tender love & nostalgia,"[""peaceful love"", ""memory"", ""serene joy""]","[""Light breathy phrasing with warmth."", ""Visualize golden wheat waving in breeze."", ""Keep delivery calm and heartfelt.""]",🌾💛 Golden field sunset,,,
Eye of the Tiger,Survivor,"High-energy rock anthem about grit, fight, and overcoming odds.",Determination & triumph,"[""power"", ""drive"", ""courage""]","[""Strong safe rock belts; pump rhythm physically."", ""Visualize training montage to victory."", ""Shouty but supported choruses.""]",🐅🥊 Tiger eye and boxing gloves,,,
Take Me to the King,Tamela Mann,Powerful gospel plea surrendering pain and seeking divine comfort.,Brokenness & surrender,"[""deep ache"", ""faith cry"", ""longing peace""]","[""Start soft prayerful then build safe gospel power."", ""Visualize falling at throne needing healing."", ""Clap slowly for support.""]",👑🙏 Kneeling before glowing throne,,,
You'll Be in My Heart,Tarzan,Tender Disney ballad promising protective lifelong love.,Parental love & comfort,"[""warm embrace"", ""safety"", ""gentle devotion""]","[""Sing soft and lullaby-like then build heartfully."", ""Visualize holding child or loved one close."", ""Smile softly on choruses.""]",🦍❤️ Jungle parent and child hug,,,
Everybody Wants to Rule the World,Tears for Fears,80s synth-pop warning about power and fleeting control.,Ambition & quiet caution,"[""melancholy"", ""cool distance"", ""world-weariness""]","[""Float light airy tone with steady beat."", ""Visualize globe spinning slowly under neon."", ""Keep choruses smooth not harsh.""]",🌎🕹️ Neon control globe,,,
Search Party!,The All-American Rejects,Energetic pop-punk call to break free and find yourself.,Freedom & self-search,"[""teen angst"", ""thrill"", ""self-discovery""]","[""Punch pop-punk grit safely; playful shouting."", ""Visualize night search with flashlights and friends."", ""Jump on beat but safe voice.""]",🔦🎸 Friends running night field,,,
Bei Mir Bist Du Schön,The Andrews Sisters,Playful swing jazz love song full of flirtation.,Flirty charm & retro joy,"[""cheeky love"", ""vintage fun"", ""glee""]","[""Tight blend, crisp swing phrasing."", ""Visualize 40s dance hall romance."", ""Smile and wink vocally.""]",💃🎷 Swing dance spotlight,,,
Chattanooga Choo Choo,The Andrews Sisters,Upbeat swing travel song full of train journey joy.,Adventure & swing fun,"[""playful travel"", ""cheery energy"", ""vintage vibe""]","[""Clear diction and trio feel; swing lightly."", ""Visualize boarding fun train trip."", ""Tap foot to swing beat.""]",🚂🎶 Swinging train ride,,,
"Sugar, Sugar",The Archies,Sweet bubblegum pop ode to love's sugary joy.,Playful puppy love & happiness,"[""sweet crush"", ""simple joy"", ""carefree fun""]","[""Light, smiley pop tone; no strain."", ""Visualize candy hearts and sunshine."", ""Keep tempo bouncy and cute.""]",🍭💌 Candy hearts,,,
House of the Rising Sun,The Animals,"Dark folk-rock tale of sin, regret, and ruined life.",Warning & sorrow,"[""despair"", ""caution"", ""haunted reflection""]","[""Sing soulful but gritty; support long lines."", ""Visualize empty house of vice and regret."", ""Keep low end steady and safe.""]",🏚️🌅 Dilapidated house silhouette,,,
Love Shack,The B-52's,Wild party anthem celebrating eccentric fun and love shack escape.,Party joy & quirky love,"[""campy fun"", ""freedom"", ""colorful happiness""]","[""Playful shout-singing but controlled."", ""Visualize funky shack disco party."", ""Dance loose and joyful.""]",🚗🎉 Neon shack with hearts,,,
Come Together,The Beatles,Groovy psychedelic rock call for unity and cool oddity.,Mystery & unity,"[""cool swagger"", ""peace"", ""strange allure""]","[""Speak-sing verses; smooth cool chorus."", ""Visualize surreal characters joining together."", ""Keep groove hypnotic but easy.""]",🧲🎸 Psychedelic magnetism,,,
Here Comes the Sun,The Beatles,Bright hopeful song after long dark period.,Renewal & joy,"[""light after dark"", ""hope"", ""gentle happiness""]","[""Gentle smile in voice; clear articulation."", ""Visualize sun breaking through clouds."", ""Keep tone intimate but cheerful.""]",🌞🌸 Sunshine breaking gloom,,,
Hey Jude,The Beatles,Comforting anthem turning sadness to hope and singalong joy.,Encouragement & healing,"[""soothing support"", ""uplift"", ""community singalong""]","[""Start soft intimate then build safe anthemic end."", ""Visualize comforting friend then huge crowd join."", ""Let na-na coda expand but not strain.""]",🤗🎶 Crowd arm-in-arm singing,,,
I Want to Hold Your Hand,The Beatles,Early Beatlemania joy in innocent young love.,Playful crush & happiness,"[""teen joy"", ""spark"", ""sweet desire""]","[""Light upbeat tone; clean diction."", ""Visualize shy hand reach turning to happy smile."", ""Bounce with beat.""]",✋💞 Hands touching shyly,,,
Let It Be,The Beatles,Gentle piano ballad offering comfort and acceptance.,Peace & letting go,"[""calm faith"", ""healing"", ""gentle hope""]","[""Keep soft gospel swell and tender piano feel."", ""Visualize mother Mary comforting night fears."", ""Let final choruses open and glow.""]",🕊️🎹 Dove on piano keys,,,
Everybody Needs Somebody to Love,The Blues Brothers,High-energy soul-rock celebration of love and togetherness.,Joy & communal love,"[""party joy"", ""connection"", ""dance energy""]","[""Sing with lively grit but safe belts."", ""Visualize crowded joyful dance floor."", ""Clap and move as you sing.""]",🎷🎉 Dancing crowd and horns,,,
Sweet Home Chicago,The Blues Brothers,Blues jam inviting return to Chicago and good times.,Homecoming & blues groove,"[""bluesy joy"", ""nostalgia"", ""urban pride""]","[""Loose relaxed blues phrasing; safe rasp."", ""Visualize smoky Chicago club night."", ""Swing gently with guitar licks.""]",🏙️🎸 Chicago skyline neon,,,
I Believe,The Book of Mormon,Humorous yet earnest Broadway solo of faith and optimism.,Faith & comedic hope,"[""sincere belief"", ""quirky joy"", ""hopeful naivety""]","[""Clear diction for comedy; warm belt at climax."", ""Visualize missionary naive but brave."", ""Smile through uncertainty.""]",🌍🎭 Missionary with book,,,
Made to Live for You,The Brooklyn Tabernacle Choir,Powerful gospel anthem of devotion and purpose in faith.,Devotion & divine calling,"[""surrender"", ""joyful service"", ""praise""]","[""Blend full gospel choir feel; safe chest belts."", ""Visualize life's purpose shining bright."", ""Clap and sway joyfully.""]",🙌✨ Choir under radiant light,,,
My Life Is in Your Hands,The Brooklyn Tabernacle Choir,Comforting gospel song trusting God in trials and fear.,Trust & comfort,"[""peaceful surrender"", ""faith"", ""safety""]","[""Gentle lead, swelling choir support."", ""Visualize safe hands catching you as you fall."", ""Keep tone tender but strong.""]",👐💛 Hands cradling heart,,,
Always on the Run,The Burkharts,Indie pop-rock about restless hearts chasing freedom and love.,Adventure & young love,"[""wild youth"", ""freedom"", ""romance""]","[""Light indie tone; safe top notes."", ""Visualize driving open highway with lover."", ""Keep vibe breezy and carefree.""]",🚙💨 Lovers in car night drive,,,
Poison & Wine,The Civil Wars,Minimalist folk duet of painful love and dependency.,Toxic love & ache,"[""desire"", ""hurt"", ""intimate tension""]","[""Keep whispers intimate; harmonies tight and safe."", ""Visualize quiet room of lovers fighting softly."", ""Stay raw but controlled.""]",🍷🖤 Broken wine glass,,,
Should I Stay or Should I Go,The Clash,Punk-rock dilemma about leaving toxic relationship with swagger.,Indecision & rebellion,"[""confusion"", ""anger"", ""playful edge""]","[""Sing edgy but not throat-pushed; shout safely."", ""Visualize slamming door yet wanting back."", ""Bounce to punk beat.""]",🚪⚡ Split heart graffiti,,,
Listen to the Music,The Doobie Brothers,Feel-good 70s rock urging peace and unity through music.,Harmony & joyful peace,"[""love"", ""optimism"", ""communal vibe""]","[""Warm folk-rock belts but supported."", ""Visualize festival field with friends dancing."", ""Smile broadly through chorus.""]",🎶☮️ Guitar in sunlit field,,,
Light My Fire,The Doors,Psychedelic rock seduction with burning passion and mystique.,Seduction & wild desire,"[""mystery"", ""lust"", ""psychedelic pull""]","[""Float hypnotic verses; build safe rock belt chorus."", ""Visualize candle and open flame desire."", ""Keep rhythm loose sensual.""]",🔥🌀 Candle flame swirling colors,,,
Jubilation,The Edwin Hawkins Singers,Joyful gospel celebration of praise and victory.,Praise & victorious joy,"[""jubilee"", ""freedom"", ""faithful joy""]","[""Full gospel power but controlled breathing."", ""Visualize clapping choir in bright robes."", ""Smile and rejoice vocally.""]",🙌🎉 Gospel celebration,,,
Oh Happy Day,The Edwin Hawkins Singers,Classic gospel of joy and salvation's celebration.,Exuberant faith & joy,"[""rejoicing"", ""freedom"", ""hope""]","[""Bright safe gospel belting; clap and sway."", ""Visualize baptismal celebration with sunlight."", ""Hold long happy notes secure.""]",☀️🎶 Joyful gospel crowd,,,
Best of My Love,The Emotions,Classic disco-soul celebration of deep joyful love.,Joy & loving devotion,"[""sunny love"", ""dance happiness"", ""devotion""]","[""Bright soulful belts with safe groove."", ""Visualize roller disco love fest."", ""Smile and sway.""]",🌞💃 Disco heart rays,,,
All I Have to Do Is Dream,The Everly Brothers,Gentle 50s harmony yearning for dreamt love.,Dreamy romance & longing,"[""sweet yearning"", ""gentle comfort"", ""nostalgia""]","[""Soft blended harmonies; relaxed phrasing."", ""Visualize dreamy summer night window."", ""Keep dynamics tender.""]",🌙💌 Moonlit couple dreaming,,,
In the Still of the Night,The Five Satins,Doo-wop classic of secret love under night sky.,Tender secret love & nostalgia,"[""innocence"", ""sweet longing"", ""romantic hush""]","[""Smooth doo-wop tone, lush blend."", ""Visualize old gym dance night quiet kiss."", ""Keep tempo slow and cozy.""]",🌌🎶 Lovers under night stars,,,
"December, 1963 (Oh What a Night!)",The Four Seasons,Upbeat nostalgic disco about magical youthful romance.,Nostalgia & excitement,"[""joy"", ""memory"", ""playful thrill""]","[""Light falsetto safely; smile in phrasing."", ""Visualize disco lights and first love."", ""Dance lightly.""]",🕺✨ Retro dance floor,,,
It's Your Thing,The Isley Brothers,Funky assertion of personal freedom and self-choice.,Empowerment & independence,"[""swagger"", ""self rule"", ""freedom""]","[""Groove funkily; safe chest belts."", ""Visualize walking confident city streets."", ""Snap to beat.""]",🕶️💃 Confident strut in spotlight,,,
"Shout, Pts. 1 & 2",The Isley Brothers,Raucous soul party jam letting loose with joy.,Celebration & letting go,"[""wild fun"", ""dance joy"", ""release""]","[""Controlled shouting safely; bounce and clap."", ""Visualize wedding dance floor madness."", ""Smile and groove.""]",🎉🙌 Crowd dancing wild,,,
ABC,The Jackson 5,Bubblegum pop-soul teaching love's basics playfully.,Innocent love & playful fun,"[""childlike crush"", ""simple joy"", ""dance energy""]","[""Bright energetic high belts safe; dance groove."", ""Visualize school chalkboard hearts."", ""Smile bright.""]",🔤💛 School love doodle,,,
I Want You Back,The Jackson 5,Joyful Motown plea for another chance in love.,Hope & youthful regret,"[""playful pleading"", ""joyful energy"", ""romantic chase""]","[""Bounce happy pop-soul phrasing; safe belts."", ""Visualize chasing lover back with dance."", ""Clap and groove.""]",💌🎶 Motown hearts and moves,,,
I'll Be There,The Jackson 5,Tender vow of steadfast love and support.,Comfort & lifelong devotion,"[""protective love"", ""tender care"", ""warmth""]","[""Gentle Motown phrasing; smooth high notes."", ""Visualize open arms protecting beloved."", ""Keep tone warm and sincere.""]",🤲❤️ Hands reaching out supportively,,,
The Bare Necessities,The Jungle Book,Playful Disney swing about simple carefree living.,Carefree joy & simplicity,"[""playful ease"", ""lightheartedness"", ""jungle fun""]","[""Swing easy with talk-sing charm."", ""Visualize jungle lazy river with bear."", ""Keep smile audible.""]",🐻🌴 Bear lounging jungle,,,
Come Home,The Lens,Indie pop yearning to return to love and safety.,Longing & safe return,"[""gentle ache"", ""warm hope"", ""home pull""]","[""Soft indie delivery; build subtle chorus."", ""Visualize running back to safe embrace."", ""Keep tone tender and hopeful.""]",🏡💌 House light glowing at dusk,,,
Circle of Life,The Lion King,Majestic opening about life's interconnectedness and awe.,Wonder & reverence,"[""awe"", ""primal life force"", ""hope""]","[""Start soft Zulu chant feel, open grand belts safely."", ""Visualize sunrise savannah animals gathering."", ""Stand tall and proud.""]",🦁🌅 Savanna sunrise animals,,,
Hakuna Matata,The Lion King,Playful carefree anthem about letting go of worries.,Carefree fun & joy,"[""humor"", ""friendship"", ""relief""]","[""Sing brightly with comedic timing."", ""Visualize jungle pals dancing worry-free."", ""Keep vibe silly and light.""]",🐗🦁 Jungle friends dancing,,,
Part of Your World,The Little Mermaid,Disney ballad of longing for freedom and new life above the sea.,Dreaming & yearning for change,"[""hopeful wonder"", ""restless desire"", ""innocence""]","[""Sing soft curious verses then lift into bright belt safely."", ""Visualize reaching for sun above ocean."", ""Let curiosity sparkle in phrasing.""]",🧜‍♀️🌊 Mermaid reaching surface,,,
Under the Sea,The Little Mermaid,Joyful Caribbean celebration of undersea life and fun.,Playful joy & contentment,"[""party"", ""colorful happiness"", ""cheer""]","[""Bounce rhythm lightly; crisp diction for fun."", ""Visualize lively coral reef party."", ""Keep energy sunny and light.""]",🐠🎶 Colorful sea parade,,,
Ho Hey,The Lumineers,Rustic indie love shout promising togetherness.,Love & belonging,"[""folk warmth"", ""hopeful plea"", ""communal joy""]","[""Gentle folk verses, joyful shouts safe."", ""Visualize barn wedding dance lights."", ""Clap and stomp lightly.""]",🏡💛 Rustic barn lights,,,
Stubborn Love,The Lumineers,Indie folk anthem about enduring love through hardship.,Resilient love & healing,"[""steadfast"", ""hurt and hope"", ""growth""]","[""Float raw tone, safe indie belts on chorus."", ""Visualize patching broken love with patience."", ""Keep stompy beat but supported.""]",🌲❤️ Cabin glowing in forest,,,
Birdland,The Manhattan Transfer,"Jazz vocalese tribute to legendary NYC club, electric and complex.",Celebration & jazz thrill,"[""swing excitement"", ""virtuosity"", ""city night joy""]","[""Precision fast scatting, breathe well."", ""Visualize neon NYC jazz club lights."", ""Keep blend tight and bright.""]",🎷🌃 Neon jazz club,,,
Bloodbuzz Ohio,The National,"Indie rock reflection on nostalgia, debt, and coming home.",Restless return & inner weight,"[""haunted memory"", ""hometown ache"", ""quiet power""]","[""Baritone steady, let words weigh heavy."", ""Visualize driving into Ohio dusk hometown."", ""Keep emotion controlled but deep.""]",🏠🌧️ Rainy Ohio road,,,
Hypnotize,The Notorious B.I.G.,Smooth braggadocious East Coast rap full of swagger.,Confidence & allure,"[""swagger"", ""luxury"", ""cool control""]","[""Deliver laid-back but commanding flow."", ""Visualize gold chains, city night ride."", ""Bounce with beat coolly.""]",💎🚘 City night luxury,,,
Juicy,The Notorious B.I.G.,Triumphant hip-hop rags-to-riches story celebrating success.,Victory & gratitude,"[""pride"", ""nostalgia"", ""hope""]","[""Smooth storytelling rap with joy."", ""Visualize young dreamer making it big."", ""Smile into gratitude lines.""]",🏆📻 Crown and boombox,,,
The Music of the Night,The Phantom of the Opera,Dark seductive invitation into mysterious world of music and passion.,Seduction & surrender to art,"[""mystery"", ""longing"", ""romantic danger""]","[""Warm legato; careful with high sustained notes."", ""Visualize candlelit underground lair."", ""Breathe deep in sensual phrasing.""]",🕯️🎭 Phantom mask and rose,,,
Every Breath You Take,The Police,Brooding pop-rock about obsession and watching lost love.,Obsession & haunting love,"[""dark devotion"", ""lonely ache"", ""yearning""]","[""Keep tone calm but tense; watch pitch control."", ""Visualize empty room watching beloved afar."", ""Subtle haunting delivery.""]",👁️💔 Watchful shadow window,,,
(I Can't Get No) Satisfaction,The Rolling Stones,Rock frustration with modern life and desire for satisfaction.,Frustration & rebellion,"[""rebellion"", ""sexual frustration"", ""angst""]","[""Punch riff-driven phrasing safe but gritty."", ""Visualize city noise and advertising overload."", ""Move body loose but strong.""]",😤🎸 Electric frustration vibe,,,
"Paint It, Black",The Rolling Stones,Dark rock plea for colorless world after loss and pain.,Grief & numb despair,"[""mourning"", ""emptiness"", ""rage""]","[""Low controlled verses, sharp chorus belts safe."", ""Visualize painting whole world black grief."", ""Keep energy cathartic not harsh.""]",🖤🖌️ Black paint across rose,,,
My Girl,The Temptations,Sweet Motown ode to love's simple joy and sunshine.,Pure love & happiness,"[""adoration"", ""warm joy"", ""sweet devotion""]","[""Smooth gentle phrasing; relaxed groove."", ""Visualize dancing with love in sunshine."", ""Smile bright and simple.""]",🌞💐 Sunshine and flowers,,,
The Lion Sleeps Tonight,The Tokens,Whimsical doo-wop lullaby about jungle peace and wonder.,Peaceful whimsy & jungle charm,"[""serene joy"", ""playful jungle"", ""comfort""]","[""Gentle falsetto safe; playful backing parts."", ""Visualize moonlit jungle and sleeping lion."", ""Keep light and dreamy.""]",🦁🌙 Jungle night peace,,,
It's Raining Men,The Weather Girls,Camp disco celebration of love and sexual freedom raining down.,Exuberance & playful desire,"[""campy fun"", ""joyous lust"", ""dance power""]","[""Big belting safe; dance with groove."", ""Visualize disco storm of men raining."", ""Smile and belt diva joy.""]",💃🌧️ Disco rainstorm,,,
Blinding Lights,The Weeknd,Synthwave pop drive fueled by obsession and late-night yearning.,Thrill & dangerous love,"[""urgent desire"", ""neon nostalgia"", ""lonely chase""]","[""Steady controlled high notes; smooth falsetto."", ""Visualize neon city speeding at night."", ""Dance but keep breath under control.""]",🌃🚗 Neon night drive,,,
Komet,Udo Lindenberg & Apache 207,"German pop-rap about fleeting life, love, and burning bright.",Intensity & living fully,"[""epic love"", ""urgency"", ""freedom""]","[""Mix spoken-rap and sung parts with grit but support."", ""Visualize blazing comet through night sky."", ""Keep passion safe on high notes.""]",☄️❤️ Flaming comet across dark sky,,,
Climax,Usher,Minimalist R&B about passion fading and heartbreak at tipping point.,Tension & heartbreak,"[""longing"", ""pain"", ""fragile intimacy""]","[""Falsetto supported but gentle; controlled dynamic build."", ""Visualize relationship breaking quietly."", ""Stay intimate and restrained.""]",🌌💔 Dim neon and fading sparks,,,
Confessions Part II,Usher,Emotional R&B confession of mistakes and guilt in love.,Guilt & vulnerability,"[""confession"", ""regret"", ""raw honesty""]","[""Smooth conversational phrasing; safe chest belts on chorus."", ""Visualize telling hard truth alone."", ""Breathe steady to hold control.""]",📖😔 Diary and tear,,,
Jump,Van Halen,80s arena rock anthem urging risk and seizing moment.,Exuberance & courage,"[""thrill"", ""fun"", ""fearless action""]","[""Powerful rock belts with safe mix; bounce rhythm."", ""Visualize diving into unknown joyfully."", ""Keep energy vibrant but controlled.""]",🏃‍♂️⚡ Neon jump silhouette,,,
From Afar,Vance Joy,Tender indie ballad about quiet unrequited love and distance.,Unrequited love & gentle ache,"[""melancholy"", ""tender longing"", ""acceptance""]","[""Soft indie delivery; breathy high notes safe."", ""Visualize loving from far but smiling sadly."", ""Keep mood wistful but warm.""]",🌅💌 Distant horizon love,,,
Last Christmas,Wham!,Bittersweet synthpop about heartbreak during the holidays.,Holiday heartbreak & nostalgia,"[""sad love"", ""Christmas memory"", ""moving on""]","[""Light pop tone with emotional tinge; safe mix on chorus."", ""Visualize snowy street after breakup."", ""Smile softly through bittersweet parts.""]",🎄💔 Broken heart ornament,,,
I Have Nothing,Whitney Houston,Powerhouse ballad begging to be loved fully and not abandoned.,Vulnerability & desperate love,"[""fear of loss"", ""pleading love"", ""soulful pain""]","[""Huge safe belt on chorus; careful support."", ""Visualize standing alone asking for love."", ""Ground before big emotional peaks.""]",🌹🎤 Rose spotlight solo,,,
I Wanna Dance with Somebody (Who Loves Me),Whitney Houston,Joyful 80s pop yearning for real love to dance away loneliness.,Loneliness & joyful desire,"[""party longing"", ""fun hope"", ""exuberance""]","[""Bright safe belts and playful rhythm."", ""Visualize vibrant dance floor with hope for love."", ""Keep moves light but supported.""]",💃🎉 Neon dance floor,,,
I Look to You,Whitney Houston,Soulful ballad finding strength and faith when lost.,Hope & renewal,"[""faith"", ""healing"", ""overcoming""]","[""Gentle gospel build with strong core support."", ""Visualize light breaking through clouds."", ""Stand tall, uplift at climax.""]",🌤️🙏 Light through clouds,,,
I Will Always Love You,Whitney Houston,Iconic farewell ballad of enduring love and letting go.,Bittersweet parting & eternal love,"[""goodbye love"", ""deep gratitude"", ""heartbreak""]","[""Soft tender intro then safe powerhouse chorus."", ""Visualize letting beloved go with love."", ""Support big sustained notes.""]",💔🌹 Farewell with white rose,,,
Defying Gravity,Wicked,Broadway anthem of self-empowerment and breaking free.,Freedom & self-belief,"[""power"", ""courage"", ""rebellion""]","[""Strong safe belts with mix, careful leaps high."", ""Visualize rising above fear and limits."", ""Stand powerful physically.""]",🧹✨ Witch flying free,,,
Love Is Fire,Working Royals,Indie anthem about passionate burning love and transformation.,Intense love & metamorphosis,"[""fire"", ""growth"", ""wild devotion""]","[""Controlled indie belts; warm chest resonance."", ""Visualize love igniting self into light."", ""Keep dynamic wide but safe.""]",🔥💞 Heart ablaze,,,
Tomorrow,Wyn Starks,Hopeful soul-pop about resilience and new beginnings.,Optimism & starting again,"[""hope"", ""fresh start"", ""joy""]","[""Bright but safe soulful belts; smile tone."", ""Visualize sunrise after hard night."", ""Keep energy light and encouraging.""]",🌅🎶 Rising sun hope,,,
C.R.E.A.M.,Wu-Tang Clan,"Iconic hip-hop about hustle, survival, and money's double edge.",Survival & street reflection,"[""grit"", ""ambition"", ""harsh truth""]","[""Laid-back but rhythmic rap delivery; clear enunciation."", ""Visualize city streets and cash hustle."", ""Stay cool and grounded.""]",💵🏙️ Dollar over city,,,
Ich will leben,Xavier Naidoo,Emotional German soul ballad about wanting to live and love fully.,Yearning & inner fight,"[""life hunger"", ""hope"", ""deep pain""]","[""Sing warm German soul; strong but safe climaxes."", ""Visualize breaking chains to embrace life."", ""Let breath support emotion.""]",🌱💚 Growing heart from cracks,,,
Fire to the Sky,ZIAN,Passionate pop about chasing dreams and lighting up darkness.,Aspiration & fierce hope,"[""drive"", ""flame"", ""uplift""]","[""Steady build to soaring chorus; safe mix high."", ""Visualize shooting fire upward to stars."", ""Keep hope alive in tone.""]",🔥🌌 Shooting flame skyward,,,
Try Everything,Zootopia,Encouraging pop anthem about persistence and not giving up.,Resilience & cheerful bravery,"[""hope"", ""courage"", ""joyful fight""]","[""Energetic pop belts but safe; smile through delivery."", ""Visualize chasing dreams despite falls."", ""Dance lightly with beat.""]",🦊🏆 Zootopia skyline dreams,,,`;

  const lines = csvData.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    // Handle CSV parsing with proper handling of quoted values
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip the next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim()); // Add the last value
    
    const row: any = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    // Parse JSON fields
    try {
      if (row.core_feelings) {
        row.core_feelings = JSON.parse(row.core_feelings);
      }
    } catch (e) {
      row.core_feelings = [];
    }
    
    try {
      if (row.access_ideas) {
        row.access_ideas = JSON.parse(row.access_ideas);
      }
    } catch (e) {
      row.access_ideas = [];
    }
    
    return row;
  });
}



function generateSlug(artist: string, title: string): string {
  return (artist + '-' + title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function mapTheme(theme: string): string {
  const lower = theme.toLowerCase();
  
  if (lower.includes('drama') || lower.includes('turmoil')) return 'Drama & inner turmoil';
  if (lower.includes('rebellion') || lower.includes('defiance') || lower.includes('unstoppable')) return 'Rebellion & defiance';
  if (lower.includes('grief') || lower.includes('solace')) return 'Grief & solace';
  if (lower.includes('freedom') || lower.includes('redemption') || lower.includes('breaking free')) return 'Freedom / breaking free';
  if (lower.includes('love') && (lower.includes('tender') || lower.includes('devotion'))) return 'Tender love & devotion';
  if (lower.includes('faith') || lower.includes('praise') || lower.includes('gospel') || lower.includes('spiritual')) return 'Joyful praise & faith';
  if (lower.includes('unity') || lower.includes('empowerment')) return 'Hopeful unity & empowerment';
  if (lower.includes('nostalgia') || lower.includes('holiday')) return 'Nostalgia & holiday warmth';
  if (lower.includes('identity') || lower.includes('authentic')) return 'Identity & authenticity';
  if (lower.includes('resilience') || lower.includes('striving') || lower.includes('triumph')) return 'Resilience & striving';
  if (lower.includes('yearning') || lower.includes('reunion')) return 'Yearning & reunion';
  if (lower.includes('playful') || lower.includes('flirt') || lower.includes('groove')) return 'Playful groove & flirtation';
  if (lower.includes('support') || (lower.includes('comfort') && !lower.includes('grief'))) return 'Unconditional support & comfort';
  if (lower.includes('peace') || lower.includes('solitude') || lower.includes('bittersweet')) return 'Bittersweet peace & solitude';
  
  return 'Awe & contemplation';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    let success = 0;
    let skipped = 0;
    let errors = 0;
    const logs: string[] = [];
    
    // Get all songs from embedded CSV data
    logs.push('Loading songs from embedded CSV data...');
    const songsData = getSongsData();
    
    if (songsData.length === 0) {
      logs.push('No songs found in CSV data');
      return new Response(
        JSON.stringify({ error: 'No songs found', logs }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }
    
    logs.push(`Found ${songsData.length} songs to import`);

    for (const song of songsData) {
      const slug = generateSlug(song.artist, song.title);

      // Check if exists
      const { data: existing } = await supabaseClient
        .from('songs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        logs.push(`Skipped duplicate: ${song.artist} - ${song.title}`);
        skipped++;
        continue;
      }

      // Insert song
      const { data: newSong, error: songError } = await supabaseClient
        .from('songs')
        .insert({
          title: song.title,
          artist: song.artist,
          slug,
          song_title: song.title,
        })
        .select()
        .single();

      if (songError) {
        logs.push(`Error inserting ${song.artist} - ${song.title}: ${songError.message}`);
        errors++;
        continue;
      }

      // Insert feeling card
      const canonicalTheme = mapTheme(song.theme);
      const { error: cardError } = await supabaseClient
        .from('feeling_cards')
        .insert({
          song_id: newSong.id,
          summary: song.summary,
          theme: canonicalTheme,
          core_feelings: song.core_feelings,
          access_ideas: song.access_ideas,
          visual: song.visual,
        });

      if (cardError) {
        logs.push(`Error creating card for ${song.artist} - ${song.title}: ${cardError.message}`);
        await supabaseClient.from('songs').delete().eq('id', newSong.id);
        errors++;
        continue;
      }

      logs.push(`Imported: ${song.artist} - ${song.title} → ${canonicalTheme}`);
      success++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        total: songsData.length,
        imported: success,
        skipped,
        errors,
        logs
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
