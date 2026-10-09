// 생성 파일: node scripts/gen-words.mjs 로 다시 만든다. 직접 고치지 않는다.
// 한글로 조합되는 영어 단어 949개. 원본은 SCOWL이며 저작권 고지는 다음과 같다.
// Custom wordlist generated from https://app.aspell.net/create using
// the English Speller Database (ESDB) with parameters:
//   Size: 60 (default)
//   Spelling: US
//   Variant Level: 1 *default*
//   Special: hacker
//   Diacritics: strip
//
// https://wordlist.aspell.net
//
// ESDB Git Revision: Wed Jun 24 14:30:42 2026 -0400 [1e5b7d3]
// App Git Revision: Thu Jun 25 15:43:51 2026 -0400 [156fb4e]
//
// Copyright 2000-2026 by Kevin Atkinson
//
// Permission to use, copy, modify, distribute, and sell any part of the English
// Speller Database (ESDB, previously known as SCOWLv2), or word lists
// created from it, is hereby granted without fee, provided that the above
// copyright notice appears in all copies and that both the above copyright
// notice and this notice appear in supporting documentation.  Kevin Atkinson
// makes no representations about the suitability of this database for any
// purpose.  It is provided "as is" without express or implied warranty.
//
// ESDB is derived from many sources, most of which are in the Public Domain.
// Data from the Corpus of Contemporary American English (COCA) was also used.
//
// All data from COCA comes from 3-gram data that is not freely available;
// however, the usage is within the rights given by the NDA that was signed when
// purchasing the data.  More information on COCA is available at
// https://www.english-corpora.org/coca/.
//
// The primary source of words for ESDB comes from 12dicts and ENABLE2K.  Both
// are in the Public Domain, but Alan Beale <biljir@pobox.com> deserves special
// credit as he is the author of 12dicts and a major contributor to ENABLE2K.  In
// addition, he gave me an incredible amount of feedback and created a number of
// special lists in order to help improve the overall quality of ESDB.
const ENGLISH_WORDS = new Set([
  'ab', 'aback', 'abacus', 'abash', 'abridgment', 'abs', 'absent', 'absorb', 'absorbency', 'absorbent', 'absorbs', 'absurdity',
  'ah', 'aha', 'ahem', 'aid', 'air', 'airbrush', 'airfield', 'airman', 'airmen', 'airsick', 'airtight', 'airy',
  'aka', 'alack', 'alarm', 'alarms', 'ale', 'alfalfa', 'alright', 'also', 'alt', 'alto', 'altos', 'am',
  'amatory', 'amen', 'amend', 'amendment', 'amt', 'an', 'anal', 'anathema', 'ancient', 'and', 'anent', 'aneurysm',
  'aneurysms', 'angel', 'angelfish', 'angels', 'angry', 'ant', 'anthem', 'anthems', 'anti', 'antis', 'antisepsis', 'antisocial',
  'antiviral', 'antivirals', 'antivirus', 'antsy', 'apricot', 'apt', 'audit', 'auditor', 'auditory', 'aught', 'augment', 'augur',
  'augury', 'aural', 'aureus', 'auricle', 'authenticity', 'authorial', 'authority', 'autism', 'auto', 'autofocus', 'autos', 'ayah',
  'ayahs', 'ch', 'chador', 'chai', 'chair', 'chairman', 'chairmen', 'chancy', 'chant', 'chantey', 'chaos', 'chap',
  'chapati', 'chapatis', 'chapel', 'chapels', 'chaps', 'charisma', 'charity', 'charlady', 'charm', 'charms', 'chary', 'chasm',
  'chasms', 'chem', 'chrism', 'christian', 'ciao', 'cis', 'city', 'cl', 'clack', 'clacks', 'clam', 'clams',
  'clan', 'clang', 'clangor', 'clans', 'clansman', 'clansmen', 'clap', 'claps', 'clarify', 'clarity', 'clash', 'clasp',
  'clasps', 'clausal', 'clavicle', 'clay', 'clayey', 'clean', 'cleans', 'clematis', 'clemency', 'clement', 'clench', 'clerk',
  'clerks', 'cm', 'co', 'coach', 'coachwork', 'coal', 'coalfield', 'coals', 'coaxial', 'cochair', 'cock', 'cockatiel',
  'cockatiels', 'cockfight', 'cockroach', 'cocks', 'coco', 'cocoa', 'cocos', 'cod', 'codependency', 'codependent', 'codfish', 'codify',
  'coral', 'corals', 'corbel', 'corbels', 'cordial', 'cordials', 'corgi', 'cork', 'corks', 'corm', 'corms', 'corn',
  'corneal', 'cornfield', 'corns', 'corp', 'corps', 'corpsman', 'corpsmen', 'corridor', 'cos', 'cosh', 'cosign', 'cosignatory',
  'cosigns', 'cot', 'cotangent', 'cowhand', 'cowl', 'cowls', 'cowman', 'cowmen', 'cozy', 'cpd', 'cps', 'cu',
  'curb', 'curbs', 'curl', 'curls', 'cusp', 'cusps', 'custodial', 'custodian', 'custodians', 'custody', 'cutback', 'cutbacks',
  'cuticle', 'cutlery', 'cyan', 'cyclamen', 'cyclamens', 'cycle', 'db', 'dharma', 'dhoti', 'dhotis', 'dial', 'dials',
  'diam', 'diary', 'dick', 'dickens', 'dickey', 'dicks', 'did', 'dido', 'diffident', 'diffusivity', 'dig', 'dirk',
  'dirks', 'dirndl', 'dirndls', 'dirty', 'dis', 'disband', 'disbandment', 'disbarment', 'disco', 'discos', 'discus', 'disenchant',
  'disenchantment', 'disentanglement', 'disfigurement', 'dish', 'disk', 'disks', 'dismal', 'dismantle', 'dismantlement', 'dismay', 'dismays', 'disorient',
  'disown', 'disowns', 'disparity', 'dispel', 'dispels', 'dissident', 'disturb', 'disturbs', 'ditch', 'ditsy', 'ditto', 'dittos',
  'ditty', 'divisor', 'divot', 'dixieland', 'dm', 'dns', 'do', 'dock', 'docks', 'dodgy', 'dodo', 'dodos',
  'dogma', 'dogmatism', 'dork', 'dorks', 'dorm', 'dormancy', 'dormant', 'dorms', 'dory', 'dos', 'dosh', 'dot',
  'doth', 'dotty', 'dovish', 'down', 'downfield', 'downright', 'downs', 'downtown', 'downturn', 'downturns', 'dozy', 'dpt',
  'dual', 'duck', 'ducks', 'dud', 'duel', 'duels', 'dug', 'durian', 'durians', 'dusk', 'dustman', 'dustmen',
  'dustpan', 'dustpans', 'dusty', 'dutch', 'duty', 'dyspepsia', 'eh', 'eight', 'eighth', 'eighths', 'eighty', 'eke',
  'elan', 'eland', 'eldritch', 'elegy', 'elem', 'element', 'elemental', 'elf', 'elfish', 'elvish', 'em', 'emend',
  'emeritus', 'emery', 'ems', 'enamel', 'enamels', 'enchant', 'enchantment', 'encl', 'ency', 'end', 'endowment', 'enema',
  'enrich', 'ens', 'ensign', 'ensigns', 'entanglement', 'entitle', 'entitlement', 'entity', 'entry', 'envy', 'euro', 'euros',
  'euthanasia', 'eyelash', 'ficus', 'fiduciary', 'field', 'fieldsman', 'fieldsmen', 'fieldwork', 'fiend', 'fiendish', 'fight', 'fightback',
  'figment', 'fir', 'firebrick', 'firebricks', 'fireman', 'firemen', 'firm', 'firmament', 'firms', 'firth', 'firths', 'fish',
  'fit', 'fitment', 'fixity', 'fizz', 'fl', 'flab', 'flack', 'flacks', 'flagman', 'flagmen', 'flair', 'flak',
  'flake', 'flamenco', 'flamencos', 'flan', 'flans', 'flap', 'flaps', 'flash', 'flask', 'flasks', 'flatland', 'flatus',
  'flavor', 'flay', 'flays', 'flt', 'foal', 'foals', 'foam', 'foams', 'focus', 'foghorn', 'foghorns', 'fogy',
  'for', 'foray', 'forays', 'forehand', 'foreign', 'foreman', 'foremen', 'forgo', 'forgot', 'fork', 'forks', 'form',
  'formal', 'formals', 'forms', 'forth', 'forthright', 'forthwith', 'fortify', 'forty', 'fowl', 'fowls', 'foxy', 'fps',
  'fuchsia', 'fuck', 'fucks', 'fuel', 'fuels', 'funnel', 'funnels', 'fur', 'furl', 'furls', 'furn', 'furor',
  'furry', 'fury', 'fussy', 'fustian', 'fusty', 'fut', 'futurism', 'futurity', 'fuzz', 'gg', 'giant', 'giddy',
  'girl', 'girlfriend', 'girls', 'giro', 'giros', 'gj', 'gl', 'glacial', 'gladiator', 'gladiatorial', 'glam', 'gland',
  'glans', 'glen', 'glens', 'gm', 'gn', 'gnarl', 'gnarls', 'gnash', 'go', 'goal', 'goals', 'god',
  'gorp', 'gory', 'gosh', 'goshawk', 'goshawks', 'gospel', 'gospels', 'got', 'gotcha', 'goth', 'goths', 'gown',
  'gowns', 'gunnel', 'gunnels', 'gurney', 'guru', 'gurus', 'gush', 'gussy', 'gusto', 'gusty', 'gut', 'gutsy',
  'guttural', 'gutturals', 'gutty', 'gyro', 'gyros', 'quake', 'quango', 'quangos', 'quant', 'quantify', 'quantity', 'quay',
  'quays', 'quench', 'rhapsody', 'rhesus', 'rhetorician', 'rhetoricians', 'rho', 'rhos', 'rial', 'rials', 'rich', 'rick',
  'ricks', 'rid', 'ridgy', 'rifleman', 'riflemen', 'right', 'rightism', 'righto', 'righty', 'rigid', 'rigidity', 'rigor',
  'risen', 'risk', 'risks', 'risotto', 'risottos', 'ritual', 'rituals', 'ritzy', 'rm', 'rn', 'roach', 'roam',
  'roams', 'roan', 'roans', 'rock', 'rockfish', 'rocks', 'rococo', 'rod', 'rodent', 'rodeo', 'rodeos', 'rosemary',
  'rosy', 'rot', 'rotgut', 'roti', 'rotis', 'rotor', 'rps', 'ruck', 'rucks', 'ruddy', 'rue', 'ruffian',
  'ruffians', 'runnel', 'runnels', 'rural', 'rush', 'rusk', 'rusks', 'rusticity', 'rustle', 'rusty', 'rut', 'rutty',
  'sh', 'shack', 'shacks', 'shadowy', 'shady', 'shah', 'shahs', 'shake', 'shakedown', 'shakedowns', 'shaken', 'shale',
  'shalt', 'sham', 'shaman', 'shamans', 'shamrock', 'shamrocks', 'shams', 'shandy', 'shanghai', 'shanty', 'shantytown', 'shantytowns',
  'shariah', 'shark', 'sharks', 'sharp', 'sharpen', 'sharpens', 'sharps', 'shawl', 'shawls', 'shay', 'shays', 'shebang',
  'shekel', 'shekels', 'shelf', 'shriek', 'shrieks', 'shtick', 'shticks', 'sick', 'sicken', 'sickens', 'sicks', 'sideman',
  'sidemen', 'sigh', 'sighs', 'sight', 'sigma', 'sign', 'signal', 'signals', 'signatory', 'signs', 'sir', 'siren',
  'sirens', 'sis', 'sisal', 'sissy', 'situ', 'skepticism', 'skewbald', 'slab', 'slabs', 'slack', 'slacken', 'slackens',
  'slacks', 'slake', 'slam', 'slams', 'slang', 'slangy', 'slant', 'slap', 'slaps', 'slapstick', 'slash', 'slavish',
  'slay', 'slays', 'sleigh', 'sleighs', 'sleight', 'slept', 'sleuth', 'sleuths', 'smack', 'smackdown', 'smacks', 'smash',
  'smelt', 'snack', 'snacks', 'snafu', 'snafus', 'snake', 'snap', 'snaps', 'snark', 'snarks', 'snarl', 'snarls',
  'sneak', 'sneaks', 'so', 'soak', 'soaks', 'soap', 'soaps', 'social', 'socials', 'sock', 'socks', 'sod',
  'softback', 'softy', 'sordid', 'sorority', 'sorry', 'sot', 'sottish', 'sown', 'spa', 'spacial', 'spadix', 'spam',
  'spams', 'span', 'spans', 'spark', 'sparks', 'spasm', 'spasms', 'spatial', 'spawn', 'spawns', 'spay', 'spays',
  'spend', 'spent', 'sprang', 'spray', 'sprays', 'spry', 'suavity', 'such', 'suck', 'sucks', 'sudsy', 'sufficiency',
  'sufficient', 'surtitle', 'survivor', 'suspend', 'tb', 'tbsp', 'than', 'thane', 'theism', 'them', 'theme', 'themself',
  'then', 'theorem', 'theorems', 'theory', 'they', 'tho', 'thorn', 'thorns', 'thrifty', 'throaty', 'throttle', 'throwback',
  'throwbacks', 'thrown', 'thru', 'thrush', 'thx', 'ti', 'tick', 'ticks', 'ticktock', 'ticktocks', 'tidal', 'tideland',
  'tidemark', 'tidemarks', 'tidy', 'tieback', 'tiebacks', 'tight', 'tighten', 'tightens', 'tit', 'titan', 'titans', 'titch',
  'titian', 'title', 'tittle', 'titty', 'tizz', 'to', 'toady', 'today', 'toddy', 'tofu', 'torch', 'torment',
  'tormentor', 'torn', 'tornado', 'torrid', 'torridity', 'torso', 'torsos', 'torus', 'tosh', 'tot', 'total', 'totals',
  'totem', 'totems', 'town', 'towns', 'townsman', 'townsmen', 'towpath', 'towpaths', 'toxicity', 'tuck', 'tucks', 'tunnel',
  'tunnels', 'turban', 'turbans', 'turducken', 'turduckens', 'turfy', 'turgid', 'turgidity', 'turkey', 'turn', 'turns', 'turps',
  'turtle', 'tush', 'tusk', 'tusks', 'tussock', 'tussocks', 'tut', 'tutelary', 'tutor', 'tutorial', 'tutorials', 'tutti',
  'tuttis', 'tutu', 'tutus', 'ty', 'tyrant', 'tyro', 'tyros', 'vb', 'vhf', 'vial', 'vials', 'viand',
  'vigor', 'viral', 'vireo', 'vireos', 'virtual', 'virus', 'visitor', 'visor', 'visual', 'visuals', 'vivify', 'vlf',
  'vm', 'vodka', 'wb', 'whack', 'whacks', 'whale', 'wham', 'whams', 'when', 'whens', 'whey', 'who',
  'whorish', 'whorl', 'whorls', 'wick', 'wicks', 'widen', 'widens', 'width', 'widths', 'wield', 'wight', 'wirehair',
  'wiry', 'wish', 'wisp', 'wisps', 'with', 'withal', 'wordy', 'work', 'workday', 'workdays', 'works', 'world',
  'worm', 'worms', 'worn', 'worry', 'worth', 'wot', 'wotcha', 'wp', 'wussy', 'xi', 'xor', 'ziti',
  'zorch',
]);
if (typeof module !== 'undefined') module.exports = ENGLISH_WORDS;
