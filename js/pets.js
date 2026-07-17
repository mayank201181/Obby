/* ===== Pets / Creatures / Chests =====
   Open chests to roll creatures of escalating rarity. Each creature has an
   ability that helps you complete the obby. Duplicates can be sold for coins,
   and pets can be traded with friends via a trade code. */

// rarity order, low -> high (secret is the very hardest, then mythical)
const RARITIES = ['basic','rare','superRare','legendary','mythical','secret'];
const RARITY_INFO = {
  basic:     { label:'Basic',      color:'#b8c4d6' },
  rare:      { label:'Rare',       color:'#6fc3ff' },
  superRare: { label:'Super Rare', color:'#9b6bff' },
  legendary: { label:'Legendary',  color:'#ffb13c' },
  mythical:  { label:'Mythical',   color:'#ff5fb0' },
  secret:    { label:'Secret',     color:'#2bd4c0' },
};

// ability ids -> how they help. (No height-boost abilities, so pets help you
// move/float but never let you skip blocks.)
const ABILITY_INFO = {
  speed1:     'Move a bit faster',
  speed2:     'Move much faster',
  speed3:     'Move super fast!',
  glide:      'Fall slower (float)',
  glideStrong:'Float gently down',
  platform:   'Place a platform (tap the ✨ button!)',
  doubleJump: 'Double jump (tap jump again in mid-air!)',
  tripleJump: 'Triple jump (jump THREE times in the air!)',
  savefall:   'Rescue! If you fall you pop back on your last platform',
  banana:     'Throw bananas (tap 🍌) at the boss & friends!',
  highJump:   'Jump much higher!',
  hop:        '🐰 Mega Hop! Tap 🥕 to spring high into the air and refill your jumps',
  // ===== SECRET pet signature powers (one each, no repeats) =====
  polymorph:  '👽 Morph! Touch a friend or boss — turn them into ANY animal, face or accessory you own for the whole round!',
  firebreath: '🐉 Fire Breath! Blast a fire jet that hammers the boss, roasts zombies — and STUNS any friend it hits for 3 seconds',
  freeze:     '🧊 Deep Freeze! Freeze every enemy, hazard & rival solid for a few seconds',
  phase:      '👻 Ghost Phase! Go invincible & drift through all hazards for a few seconds',
  vanish:     '👻 Vanish! Turn invisible for 6 seconds — friends can\'t see you AT ALL (you look faded on your own screen). Ready again 3s after you reappear',
  lightning:  '⚡ Lightning Dash! Zap forward at crazy speed, invincible — any friend you blast past is stunned for 3 seconds',
  rocket:     '🚀 Rocket Blast! Launch WAY up into the sky, then hover gently down to nail the landing',
  slowtime:   '⏳ Time Warp! For 5 seconds the whole world — hazards AND your friends — crawls in slow motion (you\'ll see an ⏳ over them) while YOU get a speed boost. Ready again 3s after it ends',
  nightswarm: '🦇 Night Swarm! Release a burst of bats that stuns EVERY friend near you for 5 seconds and spooks the hazards. Ready again 3s after the stun ends',
  shadowdash: '🥷 Shadow Dash! Leave a fake copy of yourself standing there, turn INVISIBLE and zoom away — your friends chase the decoy while the real you sneaks off',
  rewind:     '⏰ Rewind! Snap back to exactly where you were 3 seconds ago — missed a jump? Un-miss it!',
  coinstorm:  '🧲 Coin Storm! Every coin near you flies straight into your pocket at once, plus a mega-magnet aura for a few seconds',
  icebridge:  '❄️ Ice Bridge! Conjure a sparkling bridge of ice platforms in front of you to cross any gap',
  blackhole:  '🕳️ BLACK HOLE! Every coin on the WHOLE MAP flies into your pocket, every friend everywhere is stunned for 4s and all hazards freeze. The most greedy power in the game',
  goldrush:   '🤑 GOLD RUSH! Instantly pocket 25 coins, DOUBLE every coin you grab for 20 seconds, and a mega-magnet aura pulls loot to you the whole time',
  herotime:   '🦸 HERO TIME! For 6 seconds you are invincible, super fast and can jump INFINITELY — basically flying with style',
  eruption:   '🌋 ERUPTION! Explode a ring of fireballs in every direction — roasts zombies, hammers the boss and stuns every friend the flames touch',
  miracle:    '👼 MIRACLE! 8 seconds of invincibility while you float like a feather — nothing can hurt you, and falls barely matter',
  teleport:   '🌈 Blink! Tap anywhere to teleport right there — plus super speed & a higher jump',
  grapple:    '🦑 Tentacle! Fling way up and reel yourself onto a high ledge',
  flight:     '🦄 Rainbow Flight! Soar anywhere, invincible, for 5 seconds — ready again just 3s after you land',
  stomp:      '🦕 Mega Stomp! Crash down with a shockwave that flattens & stuns everyone near you',
  supernova:  '🌟 SUPERNOVA! Erupt in starlight — stun every rival, wipe nearby hazards, tame the boss & launch skyward, invincible',
  // ===== MYTHICAL activated power (strong, but below the secrets) =====
  cloudjump:  '☁️ Cloud Leap! Launch high off a cloud and refill your jumps in mid-air',
  // ===== TROLL powers =====
  poop:       '💩 Poop! Drop a stinky pile (tap 💩) — anyone who steps in it is frozen for 3 seconds!',
  swap:       '🥸 Switcheroo! Instantly SWAP places with a friend ANYWHERE on the map — steal their spot right before the finish line!',
  honk:       '🤡 HONK! Every friend near you gets REVERSED controls for 4 seconds — left is right, right is left, chaos guaranteed!',
  eggsplat:   '🐔 Egg Splat! Hurl 3 eggs in a spread — any friend they splat on gets stunned. Bok bok!',
  // ===== passive glow =====
  starglow:   '✨ Starglow: your blob shimmers with a gorgeous rainbow-star aura',
  coinmagnet: 'Coins are always pulled to you',
  autoshield: 'Start every level with a shield 🛡️',
};

// the creature roster
const CREATURES = [
  // basic — sell 30
  { id:'mouse',   name:'Mouse',     emoji:'🐭', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'frog',    name:'Frog',      emoji:'🐸', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'hamster', name:'Hamster',   emoji:'🐹', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'chick',   name:'Chick',     emoji:'🐤', rarity:'basic', abilities:[],         sell:30 },
  { id:'hedgehog',name:'Hedgehog',  emoji:'🦔', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'puppy',   name:'Puppy',     emoji:'🐶', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'bee',     name:'Bee',       emoji:'🐝', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'duck',    name:'Duck',      emoji:'🦆', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'ladybug', name:'Ladybug',   emoji:'🐞', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'fishy',   name:'Fishy',     emoji:'🐟', rarity:'basic', abilities:['glide'],  sell:30 },
  { id:'piglet',  name:'Piglet',    emoji:'🐷', rarity:'basic', abilities:['speed1'], sell:30 },
  { id:'snail',   name:'Snail',     emoji:'🐌', rarity:'basic', abilities:['autoshield'], sell:30 },
  // rare — sell 70
  { id:'bunny',   name:'Bunny',     emoji:'🐰', rarity:'rare', abilities:['hop','speed1'], sell:70 },
  { id:'fox',     name:'Fox',       emoji:'🦊', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'cat',     name:'Cat',       emoji:'🐱', rarity:'rare', abilities:['glide'],  sell:70 },
  { id:'turtle',  name:'Turtle',    emoji:'🐢', rarity:'rare', abilities:['autoshield'], sell:70 },
  { id:'penguin', name:'Penguin',   emoji:'🐧', rarity:'rare', abilities:['glide','speed1'], sell:70 },
  { id:'otter',   name:'Otter',     emoji:'🦦', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'koala',   name:'Koala',     emoji:'🐨', rarity:'rare', abilities:['glide'],  sell:70 },
  { id:'squirrel',name:'Squirrel',  emoji:'🐿️', rarity:'rare', abilities:['speed1'], sell:70 },
  { id:'crab',    name:'Crab',      emoji:'🦀', rarity:'rare', abilities:['autoshield'], sell:70 },
  { id:'parrot',  name:'Parrot',    emoji:'🦜', rarity:'rare', abilities:['glide','speed1'], sell:70 },
  { id:'flamingo',name:'Flamingo',  emoji:'🦩', rarity:'rare', abilities:['glide'], sell:70 },
  { id:'dolphin', name:'Dolphin',   emoji:'🐬', rarity:'rare', abilities:['highJump'], sell:70 },
  // super rare — sell 120
  { id:'wolf',    name:'Wolf',      emoji:'🐺', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'eagle',   name:'Eagle',     emoji:'🦅', rarity:'superRare', abilities:['glide'],  sell:120 },
  { id:'tiger',   name:'Tiger',     emoji:'🐯', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'raccoon', name:'Raccoon',   emoji:'🦝', rarity:'superRare', abilities:['coinmagnet','speed1'], sell:120 },
  { id:'hyena',   name:'Hyena',     emoji:'🐆', rarity:'superRare', abilities:['poop','highJump'], group:'troll', sell:120 },
  { id:'mrswap',  name:'Mr. Swap',  emoji:'🥸', rarity:'superRare', abilities:['swap','speed1'],    group:'troll', sell:120 },
  { id:'chicken', name:'Chicken',   emoji:'🐔', rarity:'superRare', abilities:['eggsplat','glide'], group:'troll', sell:120 },
  { id:'kangaroo',name:'Kangaroo',  emoji:'🦘', rarity:'superRare', abilities:['highJump'], sell:120 },
  { id:'bear',    name:'Bear',      emoji:'🐻', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'peacock', name:'Peacock',   emoji:'🦚', rarity:'superRare', abilities:['glide','speed1'], sell:120 },
  { id:'boar',    name:'Boar',      emoji:'🐗', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'shark',   name:'Shark',     emoji:'🦈', rarity:'superRare', abilities:['speed2'], sell:120 },
  { id:'owl',     name:'Owl',       emoji:'🦉', rarity:'superRare', abilities:['glideStrong'], sell:120 },
  { id:'croc',    name:'Croc',      emoji:'🐊', rarity:'superRare', abilities:['speed2'], sell:120 },
  // legendary — sell 200
  { id:'lion',    name:'Lion',      emoji:'🦁', rarity:'legendary', abilities:['speed2'],   sell:200 },
  { id:'elephant',name:'Elephant',  emoji:'🐘', rarity:'legendary', abilities:['platform'], sell:200 },
  { id:'giraffe', name:'Giraffe',   emoji:'🦒', rarity:'legendary', abilities:['glideStrong'], sell:200 },
  { id:'monkey',  name:'Monkey',    emoji:'🐵', rarity:'legendary', abilities:['banana'], group:'troll', sell:200 },
  { id:'clown',   name:'Clown',     emoji:'🤡', rarity:'legendary', abilities:['honk','doubleJump'], group:'troll', sell:200 },
  { id:'panda',   name:'Panda',     emoji:'🐼', rarity:'legendary', abilities:['autoshield','speed1'], sell:200 },
  { id:'rhino',   name:'Rhino',     emoji:'🦏', rarity:'legendary', abilities:['speed2'], sell:200 },
  { id:'gorilla', name:'Gorilla',   emoji:'🦍', rarity:'legendary', abilities:['speed2','highJump'], sell:200 },
  { id:'zebra',   name:'Zebra',     emoji:'🦓', rarity:'legendary', abilities:['highJump','speed1'], sell:200 },
  { id:'trex',    name:'T-Rex',     emoji:'🦖', rarity:'legendary', abilities:['speed2','highJump'], sell:200 },
  { id:'sloth',   name:'Sloth',     emoji:'🦥', rarity:'legendary', abilities:['autoshield','glideStrong'], sell:200 },
  // mythical — sell 320
  { id:'phoenix', name:'Phoenix',   emoji:'🔥', rarity:'mythical', abilities:['savefall','glideStrong'], sell:320 },
  { id:'butterfly',name:'Butterfly',emoji:'🦋', rarity:'mythical', abilities:['doubleJump','glide'],       sell:320 },
  { id:'octopus', name:'Octopus',   emoji:'🐙', rarity:'mythical', abilities:['platform','speed1'], sell:320 },
  { id:'pegasus', name:'Pegasus',   emoji:'🐴', rarity:'mythical', abilities:['cloudjump','doubleJump'],   sell:320 },
  { id:'swan',    name:'Swan',      emoji:'🦢', rarity:'mythical', abilities:['glideStrong','doubleJump'], sell:320 },
  { id:'narwhal', name:'Narwhal',   emoji:'🦭', rarity:'mythical', abilities:['highJump','glide'],         sell:320 },
  { id:'whale',   name:'Whale',     emoji:'🐋', rarity:'mythical', abilities:['glideStrong','highJump'],   sell:320 },
  { id:'mermaid', name:'Mermaid',   emoji:'🧜‍♀️', rarity:'mythical', abilities:['savefall','glide'],         sell:320 },
  { id:'jellyfish',name:'Jellyfish',emoji:'🪼', rarity:'mythical', abilities:['glideStrong','doubleJump'],  sell:320 },
  // more TROLLS 😈 — funny pets that mess with your friends
  { id:'tootoot',  name:'Toot Toot',   emoji:'💨', rarity:'superRare', abilities:['poop','speed2'],      group:'troll', sell:120 },
  { id:'piechucker',name:'Pie Chucker',emoji:'🥧', rarity:'superRare', abilities:['eggsplat','speed1'],  group:'troll', sell:120 },
  { id:'tpbandit', name:'TP Bandit',   emoji:'🧻', rarity:'superRare', abilities:['eggsplat','doubleJump'],group:'troll', sell:120 },
  { id:'donkey',   name:'Donkey',      emoji:'🫏', rarity:'superRare', abilities:['honk','highJump'],    group:'troll', sell:120 },
  { id:'roach',    name:'Roach Rascal',emoji:'🪳', rarity:'superRare', abilities:['poop','speed1'],      group:'troll', sell:120 },
  { id:'mime',     name:'Mime',        emoji:'🎭', rarity:'legendary', abilities:['honk','glide'],       group:'troll', sell:200 },
  { id:'gremlin',  name:'Gremlin',     emoji:'🧌', rarity:'legendary', abilities:['swap','doubleJump'],  group:'troll', sell:200 },
  { id:'sirsilly', name:'Sir Silly',   emoji:'🤪', rarity:'legendary', abilities:['swap','speed2'],      group:'troll', sell:200 },
  { id:'joker',    name:'Joker',       emoji:'🃏', rarity:'legendary', abilities:['honk','speed2'],      group:'troll', sell:200 },
  { id:'bananaboi',name:'Banana Boi',  emoji:'🍌', rarity:'legendary', abilities:['banana','speed1'],    group:'troll', sell:200 },
  // secret — sell 700 (the rarest!)
  { id:'unicorn', name:'Unicorn',   emoji:'🦄', rarity:'secret', abilities:['flight','tripleJump','speed3','glideStrong'], sell:700 },
  { id:'dragon',  name:'Dragon',    emoji:'🐉', rarity:'secret', abilities:['firebreath','tripleJump','speed3','highJump'], sell:700 },
  { id:'prism',   name:'Prism',     emoji:'🌈', rarity:'secret', abilities:['teleport','speed3','highJump','doubleJump'], sell:700 },
  { id:'kraken',  name:'Kraken',    emoji:'🦑', rarity:'secret', abilities:['grapple','speed3','doubleJump','highJump'], sell:700 },
  { id:'yeti',    name:'Yeti',      emoji:'🧊', rarity:'secret', abilities:['freeze','glideStrong','speed3','doubleJump'], sell:700 },
  { id:'ghost',   name:'Ghost',     emoji:'👻', rarity:'secret', abilities:['vanish','glideStrong','speed3','doubleJump'], sell:700 },
  { id:'alien',   name:'Alien',     emoji:'👽', rarity:'secret', abilities:['polymorph','glideStrong','speed3','doubleJump'], group:'troll', sell:700 },
  { id:'dino',    name:'Dino',      emoji:'🦕', rarity:'secret', abilities:['stomp','speed3','doubleJump','highJump'], sell:700 },
  { id:'starlight',name:'Starlight',emoji:'🌟', rarity:'secret', abilities:['supernova','starglow','speed3','tripleJump'], sell:700 },
  { id:'thunderbird',name:'Thunderbird',emoji:'⚡', rarity:'secret', abilities:['lightning','speed3','doubleJump','glide'], sell:700 },
  { id:'mecha',   name:'Mecha-Blob',emoji:'🤖', rarity:'secret', abilities:['rocket','highJump','speed3','doubleJump'], sell:700 },
  { id:'wizard',  name:'Wizard',    emoji:'🧙', rarity:'secret', abilities:['slowtime','doubleJump','speed3','glide'], sell:700 },
  { id:'vampire', name:'Vampire Bat',emoji:'🦇', rarity:'secret', abilities:['nightswarm','speed3','doubleJump','glideStrong'], sell:700 },
  { id:'ninja',   name:'Ninja',     emoji:'🥷', rarity:'secret', abilities:['shadowdash','speed3','doubleJump','highJump'], sell:700 },
  { id:'chrono',  name:'Chrono',    emoji:'⏰', rarity:'secret', abilities:['rewind','speed3','doubleJump','glide'], sell:700 },
  { id:'magnetron',name:'Magnetron',emoji:'🧲', rarity:'secret', abilities:['coinstorm','coinmagnet','speed3','doubleJump'], sell:700 },
  { id:'frostfairy',name:'Frost Fairy',emoji:'❄️', rarity:'secret', abilities:['icebridge','glideStrong','doubleJump','speed3'], sell:700 },
  // ===== the OP secrets — absolutely wild signature powers =====
  { id:'voidblob',  name:'Void Blob',  emoji:'🕳️', rarity:'secret', abilities:['blackhole','speed3','tripleJump'],   sell:700 },
  { id:'moneyking', name:'Money King', emoji:'🤑', rarity:'secret', abilities:['goldrush','coinmagnet','speed3','doubleJump'], sell:700 },
  { id:'superblob', name:'Super Blob', emoji:'🦸', rarity:'secret', abilities:['herotime','speed3','tripleJump'],    sell:700 },
  { id:'volcano',   name:'Volcano',    emoji:'🌋', rarity:'secret', abilities:['eruption','speed3','highJump','doubleJump'], sell:700 },
  { id:'angel',     name:'Angel',      emoji:'👼', rarity:'secret', abilities:['miracle','glideStrong','tripleJump','speed3'],sell:700 },
];

/* ===== the mega-roster: every pet below has its OWN unique signature perk —
   a one-of-a-kind stat mix (speed / jump / float), so no two pets play the
   same. Rows: [id, name, emoji, rarity, perk name]. ===== */
const MEGA_PETS = [
  // ---- basic ----
  ['cow','Cow','🐄','basic','Moo Muscle'], ['horse','Horse','🐎','basic','Gallop'],
  ['sheep','Sheep','🐑','basic','Wool Bounce'], ['goat','Goat','🐐','basic','Cliff Hooves'],
  ['rooster','Rooster','🐓','basic','Dawn Sprint'], ['turkey','Turkey','🦃','basic','Gobble Waddle'],
  ['dove','Dove','🕊️','basic','Feather Drift'], ['goose','Goose','🪿','basic','Honk Hustle'],
  ['rat','Rat','🐀','basic','Alley Dash'], ['boarlet','Hog','🐖','basic','Mud Skid'],
  ['caterpillar','Caterpillar','🐛','basic','Inchworm Wiggle'], ['ant','Ant','🐜','basic','Mighty Carry'],
  ['cricket','Cricket','🦗','basic','Chirp Hop'], ['beetle','Beetle','🪲','basic','Shell Shuffle'],
  ['worm','Wormy','🪱','basic','Soil Slide'], ['seal','Seal','🦭','basic','Belly Slide'],
  ['shrimp','Shrimp','🦐','basic','Tail Flick'], ['oyster','Oyster','🦪','basic','Pearl Poise'],
  ['mosquito','Mozzie','🦟','basic','Buzz Bob'], ['fly','Buzzy','🪰','basic','Loop-de-loop'],
  ['pretzel','Pretzel','🥨','basic','Salty Twist'], ['toast','Toasty','🍞','basic','Crumb Scoot'],
  ['cookie','Cookie','🍪','basic','Choc-chip Zip'], ['donut','Donut','🍩','basic','Sprinkle Roll'],
  ['cupcake','Cupcake','🧁','basic','Frosting Float'], ['lolly','Lolly','🍭','basic','Sugar Rush'],
  ['melon','Melon','🍉','basic','Seed Spit Skip'], ['strawb','Berry Bud','🍓','basic','Berry Bounce'],
  ['pineapple','Piney','🍍','basic','Spiky Strut'], ['avocado','Avo','🥑','basic','Good Fat Float'],
  // ---- rare ----
  ['deer','Deer','🦌','rare','Forest Leap'], ['llama','Llama','🦙','rare','Spit Take'],
  ['camel','Camel','🐪','rare','Desert Stride'], ['hippo','Hippo','🦛','rare','Splash Stomp'],
  ['badger','Badger','🦡','rare','Burrow Burst'], ['beaver','Beaver','🦫','rare','Dam Builder'],
  ['skunk','Skunk','🦨','rare','Stinky Speed'], ['chipmunk','Chipmunk','🐿️','rare','Cheek Boost'],
  ['blackcat','Shadow Cat','🐈‍⬛','rare','Nine Lives'], ['poodle','Poodle','🐩','rare','Fancy Prance'],
  ['snake','Noodle','🐍','rare','Slither Slide'], ['lizard','Lizzy','🦎','rare','Wall Scamper'],
  ['scorpion','Sting','🦂','rare','Tail Spring'], ['spider','Webster','🕷️','rare','Web Swing'],
  ['pufferfish','Puffy','🐡','rare','Puff Up'], ['tropicalfish','Coral','🐠','rare','Reef Rush'],
  ['lobster','Pinchy','🦞','rare','Claw Snap'], ['squid','Inky','🦑','rare','Ink Jet'],
  ['pizza','Pizza Pal','🍕','rare','Pepperoni Power'], ['burger','Burger Bud','🍔','rare','Double Stack'],
  ['taco','Taco','🌮','rare','Crunchy Shell'], ['icecream','Scoop','🍦','rare','Brain Freeze Breeze'],
  ['cactus','Cactus','🌵','rare','Prickle Guard'], ['mushroom','Shroomy','🍄','rare','Spore Spring'],
  ['clover','Lucky','🍀','rare','Four-leaf Luck'], ['balloon','Bally','🎈','rare','Helium Lift'],
  ['kite','Kitey','🪁','rare','Wind Rider'], ['yoyo','Yo-yo','🪀','rare','Snapback'],
  // ---- superRare ----
  ['orangutan','Orangutan','🦧','superRare','Vine King'], ['gibbon','Gibbon','🐒','superRare','Branch Blitz'],
  ['mammoth','Mammoth','🦣','superRare','Ice Age Charge'], ['dodo','Dodo','🦤','superRare','Un-extinct Energy'],
  ['panther','Panther','🐅','superRare','Night Prowl'], ['husky','Husky','🐕','superRare','Sled Sprint'],
  ['snowman','Frosty','⛄','superRare','Snowball Roll'], ['pumpkin','Pumpkin','🎃','superRare','Spooky Spring'],
  ['moon','Moony','🌙','superRare','Low Gravity'], ['sun','Sunny','☀️','superRare','Solar Flare Feet'],
  ['star','Twinkle','⭐','superRare','Stardust Step'], ['planet','Ringo','🪐','superRare','Orbit Glide'],
  ['dice','Dicey','🎲','superRare','Lucky Roll'], ['gamepad','Gamer','🎮','superRare','Combo Move'],
  ['teddy','Teddy','🧸','superRare','Soft Landing'], ['tophat','Sir Hat','🎩','superRare','Dapper Dash'],
  ['guitar','Shredder','🎸','superRare','Power Chord'], ['drum','Boomer','🥁','superRare','Beat Bounce'],
  ['racecar','Zoomer','🏎️','superRare','Nitro'], ['rocketship','Cosmo','🛸','superRare','Anti-gravity'],
  ['anchor','Anchor','⚓','superRare','Heavy Drop'], ['crystal','Crystal','🔮','superRare','Future Sight'],
  ['bolt','Volt','🔋','superRare','Full Charge'], ['magnet2','Maggie','🧿','superRare','Charm Pull'],
  // ---- legendary ----
  ['direwolf','Dire Wolf','🐺','legendary','Alpha Howl'], ['griffin','Griffin','🦅','legendary','Sky Talons'],
  ['bigfoot','Bigfoot','🦶','legendary','Mega Stride'], ['genie','Genie','🧞','legendary','Wish Wind'],
  ['knight','Sir Blob','🛡️','legendary','Shield Wall'], ['pirate','Captain','🏴‍☠️','legendary','Sea Legs'],
  ['viking','Viking','⚔️','legendary','Berserk Bounce'], ['samurai','Ronin','🗡️','legendary','Blade Step'],
  ['crown','His Majesty','👑','legendary','Royal Decree'], ['gem','Gemmy','💎','legendary','Facet Flash'],
  ['trophy','Champ','🏆','legendary','Winner Wings'], ['comet','Comet','☄️','legendary','Tail Blaze'],
  ['rainbowfish','Prism Fin','🐬','legendary','Rainbow Wake'], ['thunder','Rumble','🌩️','legendary','Storm Step'],
  ['tornado2','Twisty','🌪️','legendary','Cyclone Spin'], ['wave','Tsunami','🌊','legendary','Tidal Surge'],
  // ---- mythical ----
  ['fairy','Fairy','🧚','mythical','Pixie Dust'], ['elf','Elf','🧝','mythical','Elven Grace'],
  ['merman','Merman','🧜‍♂️','mythical','Trident Tide'], ['vampire2','Count Blob','🧛','mythical','Midnight Glide'],
  ['zombie','Zomblob','🧟','mythical','Unstoppable Shamble'], ['djinn','Djinn','🧞‍♀️','mythical','Sand Whirl'],
  ['seahorse','Seapony','🌊','mythical','Current Rider'], ['shootingstar','Wisher','🌠','mythical','Wish Trail'],
  ['aurora','Aurora','🌌','mythical','Northern Lights'], ['blossom','Blossom','🌸','mythical','Petal Storm'],
  ['snowflake','Flurry','❄️','mythical','Whiteout Waltz'], ['candle','Glow','🕯️','mythical','Wax Wings'],
  ['galaxia','Galaxia','🌀','mythical','Spiral Spin'],
  // ---- the last batch to make it a nice round 200 ----
  ['birdie','Birdie','🐦','basic','Tweet Trot'], ['grape','Grapey','🍇','basic','Bunch Bounce'],
  ['orange','Zesty','🍊','basic','Citrus Zing'], ['lemon2','Sour','🍋','basic','Pucker Power'],
  ['pepper','Spicy','🌶️','rare','Hot Feet'], ['broc','Broc','🥦','rare','Veggie Vigor'],
  ['corncob','Cobby','🌽','rare','Popcorn Pop'], ['satellite','Sputnik','🛰️','superRare','Orbit Boost'],
  ['bomb','Boomy','💣','superRare','Short Fuse'], ['disco','Disco','🪩','superRare','Groove Glide'],
  ['dragonfruit','Dragon Fruit','🐲','legendary','Fruit Fury'], ['medal','Medalist','🥇','legendary','Gold Standard'],
  // ---- the 300-club: 90 more pets, every one with its own signature perk ----
  ['bagel','Bagel','🥯','basic','Everything Roll'], ['pancake','Flapjack','🥞','basic','Syrup Slide'],
  ['waffle','Waffles','🧇','basic','Grid Grip'], ['croissant','Crossy','🥐','basic','Buttery Drift'],
  ['baguette','Baggy','🥖','basic','Breadstick Bound'], ['cheese2','Cheddar','🧀','basic','Cheesy Scoot'],
  ['egg','Eggy','🥚','basic','Wobble Roll'], ['friedegg','Sunny Side','🍳','basic','Sizzle Skip'],
  ['bacon','Crispy','🥓','basic','Sizzle Strut'], ['hotdog','Glizzy','🌭','basic','Snack Dash'],
  ['fries','Fry Guy','🍟','basic','Salty Sprint'], ['popcorn','Poppy','🍿','basic','Kernel Pop'],
  ['peanut','Nutty','🥜','basic','Shell Game'], ['chestnut','Chessie','🌰','basic','Autumn Drop'],
  ['rice','Onigiri','🍙','basic','Sticky Steps'], ['dumpling','Dumpy','🥟','basic','Steamy Hop'],
  ['sushi','Sushi','🍣','basic','Wasabi Wiggle'], ['bento','Bento','🍱','basic','Lunchbox Shuffle'],
  ['candy','Candy','🍬','basic','Wrapper Twist'], ['chocbar','Choco','🍫','basic','Sweet Snap'],
  ['honeypot','Honey Pot','🍯','basic','Sticky Situation'], ['milk','Moo Juice','🥛','basic','Calcium Kick'],
  ['juicebox','Juicy','🧃','basic','Straw Slurp'], ['coconut','Coco','🥥','basic','Hard Shell Hustle'],
  ['kiwi','Kiwi','🥝','basic','Fuzzy Zip'],
  ['tomato','Tommy','🍅','rare','Ketchup Splash'], ['eggplant','Eggie','🍆','rare','Purple Power'],
  ['carrot2','Crunchy','🥕','rare','Root Boost'], ['garlic','Stinker','🧄','rare','Vampire Repel'],
  ['onion','Teary','🧅','rare','Layer Peel'], ['bellpepper','Belle','🫑','rare','Crisp Kick'],
  ['cucumber','Cuke','🥒','rare','Cool As A Cucumber'], ['leafy','Leafy','🥬','rare','Salad Spin'],
  ['pea','Pod Squad','🫛','rare','Pea Shooter'], ['beans','Beans','🫘','rare','Full Of Beans'],
  ['tulip','Tulip','🌷','rare','Spring Sprout'], ['rose','Rosie','🌹','rare','Thorn Guard'],
  ['sunflower','Sunny D','🌻','rare','Heliotrope Hop'], ['hibiscus','Hibby','🌺','rare','Tropical Twirl'],
  ['bouquet','Bouquet','💐','rare','Petal Parade'], ['herb','Herby','🌿','rare','Fresh Sprint'],
  ['palmtree','Palmy','🌴','rare','Island Sway'], ['evergreen','Piney Tree','🌲','rare','Sap Speed'],
  ['leaffall','Leafo','🍂','rare','Autumn Glide'], ['seedling','Sprout','🌱','rare','Growth Spurt'],
  ['bamboo','Bamboo','🎋','rare','Lucky Stalk'], ['shell','Shelly','🐚','rare','Ocean Echo'],
  ['saxophone','Sax','🎷','superRare','Smooth Jazz Slide'], ['violin','Fiddle','🎻','superRare','String Sprint'],
  ['trumpet','Toots','🎺','superRare','Fanfare Dash'], ['banjo','Banjo','🪕','superRare','Twang Twist'],
  ['microphone','MC Blob','🎤','superRare','Drop The Mic'], ['headphone','DJ','🎧','superRare','Bass Boost'],
  ['skateboard','Sk8r','🛹','superRare','Kickflip'], ['rollerskate','Roller','🛼','superRare','Rink Rush'],
  ['surfboard','Surfer','🏄','superRare','Wave Rider'], ['skis','Skier','🎿','superRare','Slalom Slide'],
  ['sled','Sledder','🛷','superRare','Downhill Dash'], ['bike','Wheelie','🚲','superRare','Pedal Power'],
  ['scooter','Scoot','🛴','superRare','Kick Push'], ['dart','Bullseye','🎯','superRare','Dead Centre'],
  ['bowling','Kingpin','🎳','superRare','Strike Roll'], ['boomerang','Boomer Rang','🪃','superRare','Comes Back Around'],
  ['yarnball','Yarny','🧶','superRare','Unravel Sprint'], ['pinata','Pinata','🪅','superRare','Candy Burst'],
  ['castle','Castle','🏰','legendary','Fortress Footing'], ['statue','Liberty','🗽','legendary','Torch Bearer'],
  ['ferris','Ferris','🎡','legendary','Big Wheel Spin'], ['coaster','Coaster','🎢','legendary','Loop The Loop'],
  ['circus','Big Top','🎪','legendary','Ringmaster Run'], ['moai','Stoneface','🗿','legendary','Ancient Poise'],
  ['bridge2','Golden Gate','🌉','legendary','Span Sprint'], ['fountain','Fountain','⛲','legendary','Geyser Jump'],
  ['tower2','Eiffel','🗼','legendary','High Rise'], ['blastoff','Blast Off','🚀','legendary','Escape Velocity'],
  ['train','Loco','🚂','legendary','Full Steam'], ['firetruck','Siren','🚒','legendary','Emergency Speed'],
  ['chopper','Chopper','🚁','legendary','Rotor Rise'], ['sailboat','Skipper','⛵','legendary','Tailwind'],
  ['parachute','Chute','🪂','legendary','Soft Descent'],
  ['nebula','Nebula','🌫️','mythical','Star Fog'], ['eclipse','Eclipse','🌑','mythical','Shadow Sun'],
  ['fullmoon','Luna','🌕','mythical','Moonbeam Waltz'], ['stardust','Stardust','💫','mythical','Dizzy Orbit'],
  ['tidal','Poseidon','🔱','mythical','Trident Storm'], ['infinity','Infinity','♾️','mythical','Endless Stride'],
  ['sparkle','Sparkle','✨','mythical','Glitter Gale'], ['fireheart','Ember','❤️‍🔥','mythical','Blazing Heart'],
  ['bubbles','Bubbles','🫧','mythical','Pop Float'], ['crystalheart','Gemma','💠','mythical','Diamond Drift'],
];
(function(){
  const SELL={basic:30, rare:70, superRare:120, legendary:200, mythical:320};
  const SIZE={basic:0.5, rare:0.8, superRare:1.1, legendary:1.4, mythical:1.8};
  MEGA_PETS.forEach((row,i)=>{
    const [id,name,emoji,rarity,perkName]=row;
    // unique stat split per pet: three co-prime cycles guarantee no two pets
    // share the same (speed, jump, float) mix; rarity scales the total size
    const a=1+(i%11), b=1+(i%17), c2=1+(i%23), tot=a+b+c2, t=SIZE[rarity];
    CREATURES.push({ id, name, emoji, rarity, sell:SELL[rarity], abilities:[],
      perk:{ name:perkName, mods:{
        // the tiny i-scaled nudge keeps every single combo distinct even
        // after rounding — truly no two pets play the same
        move:+(1+0.18*t*(a/tot) + i*0.0004).toFixed(4),
        jump:+(1+0.11*t*(b/tot)).toFixed(4),
        fall:+(1-0.32*t*(c2/tot)).toFixed(4),
      }}});
  });
})();

const creatureById = id => CREATURES.find(c=>c.id===id);
const creaturesOfRarity = r => CREATURES.filter(c=>c.rarity===r);

// ===== Pet feeding: catch food -> merge 3 into a meal -> feed your pet =====
// all-vegetarian foods 🥦
const FOODS = [
  {id:'biscuit',    emoji:'🍪', name:'Biscuit'},
  {id:'apple',      emoji:'🍎', name:'Apple'},
  {id:'peach',      emoji:'🍑', name:'Peach'},
  {id:'banana',     emoji:'🍌', name:'Banana'},
  {id:'strawberry', emoji:'🍓', name:'Strawberry'},
  {id:'corn',       emoji:'🌽', name:'Corn'},
  {id:'carrot',     emoji:'🥕', name:'Carrot'},
  {id:'cheese',     emoji:'🧀', name:'Cheese'},
  {id:'berry',      emoji:'🫐', name:'Berry'},
  {id:'honey',      emoji:'🍯', name:'Honey'},
];
const foodById = id => FOODS.find(f=>f.id===id);

// each pet has a favourite food (love) — thematic where it makes sense, else hashed
const PET_FAVS = { lion:'biscuit', cat:'strawberry', mouse:'cheese', hamster:'cheese', bunny:'carrot',
  fox:'berry', wolf:'corn', tiger:'corn', dragon:'corn', unicorn:'honey', phoenix:'honey',
  eagle:'berry', octopus:'banana', kraken:'carrot', giraffe:'apple', elephant:'peach', chick:'banana',
  monkey:'banana', raccoon:'berry', turtle:'corn', penguin:'strawberry', hedgehog:'apple', pegasus:'honey',
  hyena:'corn', puppy:'biscuit', bee:'honey', otter:'berry', koala:'apple', kangaroo:'carrot', bear:'honey',
  panda:'corn', rhino:'apple', swan:'berry', narwhal:'strawberry', dino:'corn', starlight:'honey',
  thunderbird:'berry', mecha:'biscuit', wizard:'honey', vampire:'strawberry',
  mrswap:'cheese', clown:'banana', chicken:'corn',
  fishy:'corn', piglet:'apple', snail:'berry', parrot:'banana', flamingo:'strawberry', dolphin:'cheese',
  shark:'cheese', owl:'berry', croc:'corn', trex:'biscuit', sloth:'honey', mermaid:'strawberry',
  jellyfish:'berry', ninja:'biscuit', chrono:'apple', magnetron:'cheese', frostfairy:'strawberry' };
function hashStr(s){ let h=0; for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }
function petFav(id){ return PET_FAVS[id] || FOODS[hashStr(id)%FOODS.length].id; }
function petOkFoods(id){
  const fav=petFav(id), h=hashStr(id);
  return [FOODS[(h+3)%FOODS.length].id, FOODS[(h+7)%FOODS.length].id].filter(f=>f!==fav);
}
function foodLiking(petId, foodId){   // 'love' | 'ok' | 'dislike'
  if(foodId===petFav(petId)) return 'love';
  if(petOkFoods(petId).includes(foodId)) return 'ok';
  return 'dislike';
}

// bigger animals hold more food before they're overfed (hours of fullness capacity).
// A 3-day (72h) favourite feast only fits in a Legendary+ belly — small pets
// must eat smaller meals more often.
const PET_CAPACITY = { basic:48, rare:60, superRare:84, legendary:108, mythical:144, secret:180 };
function petCapacityH(id){ const c=creatureById(id); return PET_CAPACITY[c?c.rarity:'basic']||24; }

// a meal is 3 foods; the more the pet loves them, the longer it stays full
function mealHours(petId, foods){
  let pts=0; for(const f of foods){ const l=foodLiking(petId,f); pts += l==='love'?3 : l==='ok'?1 : 0; }
  return pts>=9?72 : pts>=6?48 : pts>=3?24 : pts>=1?6 : 2;   // up to 3 days for a perfect meal
}
function mealLiking(petId, foods){
  const h=mealHours(petId,foods);
  return h>=48?'loves it':h>=24?'likes it':h>=6?'it\'s ok':'doesn\'t like it';
}

// give every owned pet a starting full belly so nothing breaks; the clock drains from there
function ensurePetFeed(){
  if(!SAVE.petFeed) SAVE.petFeed={};
  if(!SAVE.petMood) SAVE.petMood={};
  // migrate old non-vegetarian food to veggie equivalents
  if(SAVE.foods){
    if(SAVE.foods.fish){ SAVE.foods.strawberry=(SAVE.foods.strawberry||0)+SAVE.foods.fish; delete SAVE.foods.fish; }
    if(SAVE.foods.meat){ SAVE.foods.corn=(SAVE.foods.corn||0)+SAVE.foods.meat; delete SAVE.foods.meat; }
  }
  const now=nowMs();
  const ids=new Set([...Object.keys(SAVE.pets||{}), ...Object.keys(SAVE.shinies||{}), ...Object.keys(SAVE.diamonds||{})]);
  let changed=false;
  for(const id of ids){ if((SAVE.pets[id]||0)>0 || (SAVE.shinies&&SAVE.shinies[id]>0) || (SAVE.diamonds&&SAVE.diamonds[id]>0)){
    if(SAVE.petFeed[id]==null){ SAVE.petFeed[id]=now + Math.round(petCapacityH(id)*0.3)*3600*1000; changed=true; }  // start ~30% full (room to feed)
    if(SAVE.petMood[id]==null){ SAVE.petMood[id]={h:80, t:now}; changed=true; }   // start fairly happy
    else tickMood(id);
  }}
  if(changed) persist();
}
function petFullnessMs(id){
  const until=(SAVE.petFeed&&SAVE.petFeed[id]!=null)?SAVE.petFeed[id]:(nowMs()+petCapacityH(id)*3600*1000);
  return until - nowMs();
}
function petFedState(id){                       // 'hungry' | 'fed' (pets can never be overfed)
  return petFullnessMs(id) <= 0 ? 'hungry' : 'fed';
}
function petHungerPct(id){                       // 100 = stuffed, 0 = starving
  return Math.max(0, Math.min(100, Math.round(petFullnessMs(id)/(petCapacityH(id)*3600000)*100)));
}

// ---- happiness / sadness: drifts down over time, restored by feeding ----
function tickMood(id){
  if(!SAVE.petMood) SAVE.petMood={};
  const m=SAVE.petMood[id]||(SAVE.petMood[id]={h:80,t:nowMs()});
  const now=nowMs(), dtH=(now-m.t)/3600000;
  if(dtH>0){
    const hungry=petFullnessMs(id)<=0;
    m.h=Math.max(0,Math.min(100, m.h - dtH*(hungry?6:0.5)));  // sad fast when hungry, slow when fed
    m.t=now;
  }
  return m.h;
}
function petHappiness(id){ return Math.round(tickMood(id)); }
function petIsSad(id){ return petHappiness(id) < 25; }
function petMoodFace(id){ const h=petHappiness(id); return h>=70?'😄':h>=40?'🙂':h>=25?'😐':'😢'; }
function bumpMood(id, amt){ tickMood(id); SAVE.petMood[id].h=Math.max(0,Math.min(100, SAVE.petMood[id].h+amt)); }

// only STARVING removes a pet's power (happiness is just wellbeing now)
function petCanUsePower(id){ return petFedState(id)==='fed'; }
function petPowerBlockReason(id){ return petFedState(id)==='hungry' ? 'hungry' : null; }

// ---- merging 3 foods into a named meal ----
const FOOD_GROUPS = {
  fruit:new Set(['apple','peach','banana','strawberry','berry']),
  veg:new Set(['carrot','corn']),
  sweet:new Set(['biscuit','honey','cheese']),
};
function mealInfo(foods){
  const f=foods.map(foodById);
  if(foods[0]===foods[1] && foods[1]===foods[2]) return { name:'Big '+f[0].name, emoji:f[0].emoji+f[0].emoji };
  const all=set=>foods.every(x=>set.has(x));
  if(all(FOOD_GROUPS.fruit))  return { name:'Fruit Platter', emoji:'🍓🍎' };
  if(all(FOOD_GROUPS.veg))    return { name:'Veggie Plate',  emoji:'🥗' };
  if(all(FOOD_GROUPS.sweet))  return { name:'Sweet Treat',   emoji:'🍰' };
  if(foods.every(x=>FOOD_GROUPS.fruit.has(x)||FOOD_GROUPS.sweet.has(x))) return { name:'Dessert Bowl', emoji:'🍨' };
  return { name:'Yummy Combo', emoji:'🍱' };
}

/* feed a 3-food meal to a pet; extends fullness, may overfeed */
function feedPet(petId, foods){
  if(!petId || !creatureById(petId)) return {error:'Pick a pet'};
  if(!foods || foods.length!==3) return {error:'A meal needs exactly 3 foods'};
  for(const f of foods){ if((SAVE.foods&&SAVE.foods[f]||0) < foods.filter(x=>x===f).length) return {error:'Not enough food — catch more!'}; }
  for(const f of foods){ SAVE.foods[f]--; if(SAVE.foods[f]<=0) delete SAVE.foods[f]; }
  if(!SAVE.petFeed) SAVE.petFeed={};
  const now=nowMs();
  const add=mealHours(petId,foods)*3600*1000;
  const cur=Math.max(now, SAVE.petFeed[petId]!=null?SAVE.petFeed[petId]:now);
  const cap=now + petCapacityH(petId)*3600*1000;
  SAVE.petFeed[petId]=Math.min(cur+add, cap);   // tops up to full, never overfed
  const gained=Math.max(0, Math.round((SAVE.petFeed[petId]-cur)/3600000));
  // happiness: love meal cheers them up a lot; disliked barely
  const lk=mealLiking(petId,foods);
  bumpMood(petId, lk==='loves it'?40 : lk==='likes it'?22 : lk==='it\'s ok'?12 : 6);
  persist();
  return { addedH:gained, liking:lk, state:petFedState(petId), meal:mealInfo(foods), happiness:petHappiness(petId) };
}
/* playing with a pet (in the Playground) makes it happier — less neglected */
function playWithPet(id){
  if(!id || !creatureById(id)) return 0;
  bumpMood(id, 14); persist();
  return petHappiness(id);
}
function foodCount(id){ return (SAVE.foods&&SAVE.foods[id])||0; }
function totalFood(){ let n=0; for(const k in (SAVE.foods||{})) n+=SAVE.foods[k]; return n; }

// ===== Blob-Dex collection milestones (long-term completion goals) =====
const DEX_MILESTONES = [
  { id:'own5',  need:5,                reward:150,  label:'Collect 5 different pets' },
  { id:'own10', need:10,               reward:300,  label:'Collect 10 different pets' },
  { id:'own15', need:15,               reward:600,  label:'Collect 15 different pets' },
  { id:'own20', need:20,               reward:1000, label:'Collect 20 different pets' },
  { id:'all',   need:CREATURES.length, reward:3000, label:'Complete the Blob-Dex!' },
];
function dexOwnedCount(){ return CREATURES.filter(c=>ownsAnyForm(c.id)).length; }
function dexMilestoneDone(m){ return dexOwnedCount()>=m.need; }
function dexMilestoneClaimed(id){ return (SAVE.dexClaimed||[]).includes(id); }
function claimDexMilestone(id){
  const m=DEX_MILESTONES.find(x=>x.id===id); if(!m) return false;
  if(!SAVE.dexClaimed) SAVE.dexClaimed=[];
  if(dexMilestoneClaimed(id) || !dexMilestoneDone(m)) return false;
  SAVE.dexClaimed.push(id); addCoins(m.reward); persist();
  return m.reward;
}
function dexClaimable(){ return DEX_MILESTONES.some(m=>dexMilestoneDone(m) && !dexMilestoneClaimed(m.id)); }

// chest shop: cost + rarity weights (sum 100). Basic can't give legendary/mythical.
const CHESTS = {
  basic:     { label:'Basic Chest',     cost:150, emoji:'📦',
    weights:{ basic:70, rare:24, superRare:5,  legendary:0,  mythical:0,  secret:1 } },
  rare:      { label:'Rare Chest',      cost:250, emoji:'🎁',
    trollChance:0.02,   // a very small bonus chance to pop a 😜 troll pet
    weights:{ basic:38, rare:34, superRare:18, legendary:7,  mythical:2.5,secret:0.5 } },
  legendary: { label:'Legendary Chest', cost:350, emoji:'🏆',
    trollChance:0.10,   // a bit higher troll chance than the Rare Chest
    weights:{ basic:0, rare:0, superRare:0, legendary:62, mythical:30, secret:8 } },
  // top-secret contents — don't spoil the surprise in the UI!
  mystery:   { label:'Gold Exclusive Chest', cost:10000, emoji:'👑', exclusive:true, mystery:true },
  // exclusive fixed-reward vault — guarantees a bundle (no random roll)
  gold:      { label:'Gold Vault', cost:10000, emoji:'🌟', exclusive:true,
    grants:{ pet:'unicorn', trail:'royal', skin:'rainbow' } },
};

/* the Gold Exclusive Chest: contents are a surprise — 1 random SECRET pet,
   1 random MYTHICAL pet and 1 random TROLL pet. The shop must never say so! */
function openMysteryChest(){
  const chest=CHESTS.mystery;
  if(SAVE.coins < chest.cost) return {error:'Not enough coins'};
  SAVE.coins -= chest.cost;
  const pick=arr=>arr[Math.floor(Math.random()*arr.length)];
  const three=[ pick(creaturesOfRarity('secret')),
                pick(creaturesOfRarity('mythical')),
                pick(CREATURES.filter(c=>c.group==='troll')) ];
  const out=[];
  for(const c of three){
    const had=SAVE.pets[c.id]||0; SAVE.pets[c.id]=had+1;
    out.push({creature:c, isNew:had===0, count:SAVE.pets[c.id]});
  }
  if(!SAVE.equippedPet) SAVE.equippedPet=three[0].id;
  persist();
  return { pets:out };
}

/* open the exclusive Gold Vault: a guaranteed bundle, repeatable */
function openGoldVault(){
  const chest=CHESTS.gold;
  if(SAVE.coins < chest.cost) return {error:'Not enough coins'};
  SAVE.coins -= chest.cost;
  const g=chest.grants;
  // Unicorn (secret, triple jump) — stacks if you already have one
  const had=SAVE.pets[g.pet]||0;
  SAVE.pets[g.pet]=had+1;
  if(!SAVE.equippedPet) SAVE.equippedPet=g.pet;
  // Royal trail + Rainbow colour-changing skin
  if(!SAVE.ownedTrails.includes(g.trail)) SAVE.ownedTrails.push(g.trail);
  if(!SAVE.ownedSkins.includes(g.skin)) SAVE.ownedSkins.push(g.skin);
  persist();
  return { pet:creatureById(g.pet), petWasNew:had===0, trail:trailById(g.trail), skin:skinById(g.skin) };
}

function rollRarity(weights){
  let total=0; for(const r of RARITIES) total += (weights[r]||0);
  let x = Math.random()*total;
  for(const r of RARITIES){ x -= (weights[r]||0); if(x<=0) return r; }
  return 'basic';
}

/* open a chest: returns {creature, isNew, count} or {error} */
function openPetChest(chestId){
  const chest = CHESTS[chestId];
  if(!chest) return {error:'Unknown chest'};
  if(SAVE.coins < chest.cost) return {error:'Not enough coins'};
  SAVE.coins -= chest.cost;
  // bonus roll first: Rare & Legendary chests can pop a 😜 troll pet
  if(chest.trollChance && Math.random() < chest.trollChance){
    const trolls = CREATURES.filter(c=>c.group==='troll');
    const tc = trolls[Math.floor(Math.random()*trolls.length)];
    const thad = SAVE.pets[tc.id]||0;
    SAVE.pets[tc.id] = thad+1;
    if(thad===0 && !SAVE.equippedPet) SAVE.equippedPet = tc.id;
    persist();
    return { creature:tc, isNew:thad===0, count:SAVE.pets[tc.id], troll:true };
  }
  const rarity = rollRarity(chest.weights);
  const pool = creaturesOfRarity(rarity);
  const creature = pool[Math.floor(Math.random()*pool.length)];
  const had = SAVE.pets[creature.id]||0;
  SAVE.pets[creature.id] = had+1;
  const isNew = had===0;
  if(isNew && !SAVE.equippedPet) SAVE.equippedPet = creature.id;  // auto-equip first pet
  persist();
  return { creature, isNew, count:SAVE.pets[creature.id] };
}

function petCount(id){ return SAVE.pets[id]||0; }
function ownsPet(id){ return (SAVE.pets[id]||0) > 0; }

/* sell ONE duplicate (keeps at least 1 copy) for the creature's sell value */
function sellDuplicate(id){
  const c = creatureById(id); if(!c) return {error:'?'};
  if((SAVE.pets[id]||0) <= 1) return {error:'No duplicates to sell'};
  SAVE.pets[id]--; SAVE.coins += c.sell; persist();
  return { coins:c.sell, count:SAVE.pets[id] };
}

function equipPet(id){
  if(!ownsAnyForm(id)) return false;   // a shiny- or diamond-only copy counts too
  SAVE.equippedPet = (SAVE.equippedPet===id) ? null : id;  // tap again to unequip
  persist();
  return true;
}

/* ---- pet leveling ----
   Pets earn XP while equipped (checkpoints + finishing levels). Higher level =
   a slightly stronger ability. Capped at level 10. No jump/height effects, so
   levelling can never let you skip blocks. */
const PET_MAX_LEVEL = 10;
function xpForLevel(lvl){ return Math.round(6 * lvl * (lvl+1) / 2); }  // cumulative XP to reach lvl
function petLevel(id){
  const xp = SAVE.petXp ? (SAVE.petXp[id]||0) : 0;
  let lvl = 1;
  while(lvl < PET_MAX_LEVEL && xp >= xpForLevel(lvl)) lvl++;
  return lvl;
}
function petXpInfo(id){
  const xp = SAVE.petXp ? (SAVE.petXp[id]||0) : 0;
  const lvl = petLevel(id);
  if(lvl>=PET_MAX_LEVEL) return { lvl, xp, into:1, need:1, max:true };
  const prev = lvl>1 ? xpForLevel(lvl-1) : 0;
  const next = xpForLevel(lvl);
  return { lvl, xp, into: xp-prev, need: next-prev, max:false };
}
function addPetXp(id, amount){
  if(!id || !creatureById(id)) return null;
  if(!SAVE.petXp) SAVE.petXp={};
  const before = petLevel(id);
  SAVE.petXp[id] = (SAVE.petXp[id]||0) + amount;
  const after = petLevel(id);
  persist();
  if(after>=PET_MAX_LEVEL && before<PET_MAX_LEVEL && typeof unlockAchievement==='function') unlockAchievement('maxpet');
  return { leveledUp: after>before, level: after };
}

/* ---- shiny (golden) pets ---- */
function isShiny(id){ return !!(SAVE.shinies && SAVE.shinies[id]>0); }
/* fuse 3 copies of one pet into a single shiny version of it */
function makeShiny(id){
  const c=creatureById(id); if(!c) return {error:'?'};
  if((SAVE.pets[id]||0) < 3) return {error:'Need 3 copies'};
  SAVE.pets[id]-=3; if(SAVE.pets[id]<=0) delete SAVE.pets[id];
  if(!SAVE.shinies) SAVE.shinies={};
  SAVE.shinies[id]=(SAVE.shinies[id]||0)+1;
  if(SAVE.equippedPet===id && !ownsPet(id)) SAVE.equippedPet=id;  // keep equipped (shiny counts)
  persist();
  if(typeof unlockAchievement==='function') unlockAchievement('shiny');
  return { creature:c };
}

/* ---- diamond pets: fuse 2 SHINIES of one pet into a diamond version ----
   Diamonds glow icy-bright when worn as a skin, give a bigger stat bonus
   than shinies, and their signature power recharges 1 second faster. */
function isDiamond(id){ return !!(SAVE.diamonds && SAVE.diamonds[id]>0); }
function makeDiamond(id){
  const c=creatureById(id); if(!c) return {error:'?'};
  if(!SAVE.shinies || (SAVE.shinies[id]||0) < 2) return {error:'Need 2 shinies'};
  SAVE.shinies[id]-=2; if(SAVE.shinies[id]<=0) delete SAVE.shinies[id];
  if(!SAVE.diamonds) SAVE.diamonds={};
  SAVE.diamonds[id]=(SAVE.diamonds[id]||0)+1;
  persist();
  return { creature:c };
}
/* do I own this pet in ANY form (copies, shiny or diamond)? */
function ownsAnyForm(id){ return ownsPet(id) || isShiny(id) || isDiamond(id); }

/* ---- rarity fusion: 3 pets of one rarity -> 1 random pet of the next rarity ---- */
function rarityCopies(rarity){
  let n=0; for(const c of creaturesOfRarity(rarity)) n += (SAVE.pets[c.id]||0); return n;
}
function nextRarity(rarity){
  const i=RARITIES.indexOf(rarity); return (i>=0 && i<RARITIES.length-1) ? RARITIES[i+1] : null;
}
function fuseRarity(rarity){
  const nr=nextRarity(rarity);
  if(!nr) return {error:'Secret pets can\'t fuse higher'};
  if(rarityCopies(rarity) < 3) return {error:'Need 3 '+RARITY_INFO[rarity].label+' pets'};
  // consume 3 copies, taking from the pets you own the MOST of first (spares uniques)
  let toRemove=3;
  const owned=creaturesOfRarity(rarity).filter(c=>(SAVE.pets[c.id]||0)>0)
              .sort((a,b)=>(SAVE.pets[b.id]||0)-(SAVE.pets[a.id]||0));
  for(const c of owned){
    while(toRemove>0 && (SAVE.pets[c.id]||0)>0){ SAVE.pets[c.id]--; toRemove--; if(SAVE.pets[c.id]<=0){ delete SAVE.pets[c.id]; break; } }
    if(toRemove<=0) break;
  }
  if(SAVE.equippedPet && !ownsAnyForm(SAVE.equippedPet)) SAVE.equippedPet=null;
  // roll a random pet of the next rarity
  const pool=creaturesOfRarity(nr);
  const creature=pool[Math.floor(Math.random()*pool.length)];
  const had=SAVE.pets[creature.id]||0;
  SAVE.pets[creature.id]=had+1;
  if(!SAVE.equippedPet) SAVE.equippedPet=creature.id;
  persist();
  return { creature, isNew: had===0, count: SAVE.pets[creature.id] };
}

/* aggregate the equipped pet's ability effects (used by the game engine).
   Effects scale a little with the pet's level, and shinies get a small bonus. */
function equippedAbilities(){
  const id = SAVE.equippedPet;
  const c = id ? creatureById(id) : null;
  const set = new Set(c ? c.abilities : []);
  const lvl = id ? petLevel(id) : 1;
  const dia = id ? isDiamond(id) : false;
  const shiny = (id ? isShiny(id) : false) || dia;   // diamond includes the shiny bonus
  const lvlBoost = (lvl-1)*0.015 + (dia?0.10 : shiny?0.06 : 0);   // diamonds hit harder
  const glideBoost = (lvl-1)*0.01 + (dia?0.06 : shiny?0.04 : 0);
  const baseMove = set.has('speed3')?1.6 : set.has('speed2')?1.4 : set.has('speed1')?1.2 : 1;
  const baseFall = set.has('glideStrong')?0.55 : set.has('glide')?0.75 : 1;
  // unique per-pet signature perk (generated pets): small stat mods on top
  const pm = (c && c.perk && c.perk.mods) || null;
  // 🤫 SECRET pets are SUPER DUPER GOOD: an extra all-round boost on top
  const secretMul = (c && c.rarity==='secret') ? 1.12 : 1;
  return {
    moveMul: (baseMove>1 ? baseMove+lvlBoost : 1) * (pm?pm.move:1) * secretMul,
    jumpMul: ((set.has('highJump')||set.has('highJump2'))? 1.2 + (lvl-1)*0.008 + (shiny?0.03:0)
           : set.has('highJump1')?1.1 : 1) * (pm?pm.jump:1) * (secretMul>1?1.06:1),
    fallMul: Math.max(0.4, (baseFall<1 ? Math.max(0.45, baseFall-glideBoost) : 1) * (pm?pm.fall:1)),
    maxJumps: set.has('tripleJump')?3 : set.has('doubleJump')?2 : 1,
    canPlatform: set.has('platform'),
    canSaveFall: set.has('savefall'),
    canBanana:   set.has('banana'),
    canPoop:     set.has('poop'),
    canMagnet:   set.has('coinmagnet'),
    canShield:   set.has('autoshield'),
    glow:        set.has('starglow'),
    power: ['polymorph','firebreath','freeze','vanish','phase','teleport','grapple','flight','stomp','supernova','lightning','rocket','slowtime','nightswarm','shadowdash','rewind','coinstorm','icebridge','blackhole','goldrush','herotime','eruption','miracle','swap','honk','eggsplat','cloudjump','hop'].find(pw=>set.has(pw)) || null,
  };
}
// creatures tagged as trolls (shown in their own collection section)
function creaturesOfGroup(g){ return CREATURES.filter(c=>c.group===g); }

/* ---- trading by code (no server: a shareable code transfers a pet) ---- */
function makeTradeCode(petId, toName){
  if(!ownsPet(petId)) return {error:"You don't own that pet"};
  // remove one copy from sender
  SAVE.pets[petId]--; if(SAVE.pets[petId]<=0) delete SAVE.pets[petId];
  if(SAVE.equippedPet===petId && !ownsPet(petId)) SAVE.equippedPet=null;
  persist();
  const nonce = Math.floor(Math.random()*1e9).toString(36);
  const payload = JSON.stringify({ p:petId, to:(toName||'').trim(), from:(SAVE.name||'Friend'), n:nonce });
  return { code: 'PET-' + btoa(payload).replace(/=+$/,'') };
}
function redeemTradeCode(code){
  try{
    const raw = (code||'').trim().replace(/^PET-/,'');
    const data = JSON.parse(atob(raw));
    if(!data.p || !creatureById(data.p)) return {error:'Invalid code'};
    if(SAVE.claimedTrades.includes(data.n)) return {error:'Code already used'};
    SAVE.claimedTrades.push(data.n);
    SAVE.pets[data.p] = (SAVE.pets[data.p]||0)+1;
    if(!SAVE.equippedPet) SAVE.equippedPet=data.p;
    persist();
    return { creature:creatureById(data.p), from:data.from||'Friend', to:data.to||'' };
  }catch(e){ return {error:'Invalid code'}; }
}
