MULTIPLAYER MODEL
=================

We load a common texture set at game startup.

Every tile in view needs to send:
--------------------------------
  1. Is there an obstacle?
  2. One or two texture names
  3. Obstacle health
  4. At most one item texture name, if applicable.

Every mob needs to send:
-----------------------
  1. A texture
  2. A current velocity

Every bullet needs to send:
---------------------------
  1. A texture name
  2. A current velocity

Player commands look like:
--------------------------
  1. A velocity change command, involving a keydown or keyup; sends desired velocity vector, which is checked for magnitude.
  2. A use command, involving a true point, a target square, and a tool.

ATTRIBUTES
==========

**INT**: Affects crafting and spellcasting success rates. Exercised by spellcasting, crafting, and exploration.

**CHA**: Affects gloria generation rate from house, killed NPC mobs, and NPC quests. Also affects Bluff skill. Exercised by trading and party XP sharing. Abused by being Satiated and by taking near-death damage.

**STR**: Affects weapon damage, mining, and max inventory size. Exercised by mining and fighting.

**DEX**: Affects crafting and lockpicking success rates and weapon to-hit. Exercised by crafting, lockpicking, and fighting.

**POW**: Affects total mana and mana regeration rate. Exercised constantly, and by sacrificing to your god. Abused by being low on mana and being hungry.

**CON**: Affects total health and health regeneration rate. Exercised constantly, and by sacrificing to your god. Abused by taking damage and being hungry.

RACES
=====

We copy the D&D races.

**HUMAN**
  - CHA +3
  - All skills +10%
  - Friendly to all players except Half-Orcs (neutral).

**ELF**
  - INT +5, CHA +5, POW +5
  - STR -3
  - All magic +30%
  - Bows +25%
  - Axes, saws -10%
  - Racial power: can make trees grow on grass extremely quickly
  - Best suited to be a Mage

**DWARF**
  - STR +5, CON +5
  - INT -3, POW -3
  - All mining +50%
  - Best suited to be a Miner or Melee Fighter

**HALFLING**
  - DEX +7, CHA +3
  - STR -4, CON -3
  - Always "fast"
  - Best suited to be a Rogue

**GNOME**
  - INT +5, DEX +5, POW +5
  - STR -3, CON -3
  - All magic +25%
  - All crafting +25%
  - Crossbows +10%
  - Best suited to be a Mage or a Crafter

**HALF-ORC**
  - STR +10, CON +10
  - INT -5, POW -5, CHA -5
  - All fighting +50%
  - Racial power: All melee attacks +STRd5, as the "unarmed" bonus.
  - Hostile to most players except Humans (neutral) and other half-orcs
  - Best suited to be a Melee Fighter

RACIAL ALIGNMENTS:
------------------
(0 = friendly, X = hostile)
 HEDLGO
H00000
E00 0 X
D0 0 0X
L00   X
G0 0  X
O XXXXX

Halflings and Elves are friendly
Gnomes and Dwarves are friendly
Humans are friendly to all, neutral to Orcs
Orcs are hostile to all, neutral to Humans

Only friendly mobs can be party members. Players will have flags to turn on/off vs friendly and vs neutral fire; vs hostile fire is always on.
One hit to a Friendly mob will reduce your standing with that race to Neutral.

For a party to form, each player must be Friendly with each other players' race.

Killing a mob reduces your standing with their race; you may become Hostile if this gets too low.
Trading with a mob increases your standing with their race; you may become Friendly if this gets high enough.

SKILL TREE
==========

Magic
    - Affects failure rates for spellcasting. Any spell needs to pass a Magic Skill / INT check to succeed.
  Arcane
  Elemental
    Fire
    Water
    Earth
    Air
  Divination
  Conveyance
  Matter
  Healing
  Nature
  Summoning
  Mind
  Enchantment
  Scribing (making scrolls and spellbooks)
Fighting
    - Affects to-hit and damage while fighting. Every hit needs to pass a Fighting Skill / Weapon Quality / DEX check to succeed, and after the hit rolls a Fighting Skill / Weapon Quality / STR check to damage.
  Daggers (cheaper than all others)
  Staves (cheaper than all others)
  Swords
  Battle-Axes
  Polearms
  Flails
  Crossbows
  Bows
  Bashing (Wielded Nonweapon, like axes and pickaxes)
  Martial Arts (No weapon)
Mining
    - Affects mining speed and chance. Every mining hit needs to pass a Mining Skill / Tool Quality / STR / DEX check to destroy the block.
  Axes
  Saws
  Pickaxes
  Drills
Crafting
   - Any recipe needs a Crafting Skill / INT / DEX check to succeed. Failed recipes may destroy one or more ingredient ("Oh no! A Stone shatters as you try to jam it in!"), and produce nothing ("Your contraption falls to pieces"), an entirely different recipe ("Wait a minute, that's not right... you confuse yourself and make a Dagger instead."), or a "piece of useless junk." The success chance is based on the ingredients involved, and the mechanical difficulty level. All items have tiers; the higher the tier, the higher the Mechanics skill must be; all items have Type compositions; the more of a certain Type, the higher that skill must be.
  Masonry (Stone-type materials)
  Forging (Metal-type materials)
  Jewelry (Crystal-type materials)
  Carpentry (Wood-type materials)
  Tailoring (Cloth-type materials)
  Cooking (Meat- and plant- type materials)
  Alchemy (Potion-type materials)
  Mechanics (For all advanced things with moving parts)
Subterfuge
    - A miscellaneous category for rogueish behaviours
  Dodge
    - Improves probability of saving throw (taking no damage) when an enemy hits. Saving throw rolls Dodge Skill / DEX.
  Stealth
    - Decreases the chance that sleeping mobs will wake as you arrive. Stealth is the only thing that affects this roll.
  Lockpicking
    - Increases the probability of lockpicking succeess. Lockpicking success must pass a Lockpicking Skill / DEX check.
  Bluff
    - Increases the chance of appearing Neutral or Friendly to mobs that are actually Hostile. This illusion has a chance of breaking when you use any tool or weapon, checked against Bluff Skill / CHA.

DE FACTO CLASSES
================

Mage (max a selection of Magic, INT, POW)

Fighter (max one melee Fighting, STR, CON)

Archer (max one ranged Fighting, STR, DEX)

Rogue (max all Subterfuge, CHA, DEX)

Crafter (max a selection of Crafting, INT, DEX)

Miner (max Mining, STR, DEX)

GLORIA
======
Gloria is the currency of the game. You get gloria by killing monters appropriate for your level (the higher level you are, the less gloria you get from monsters). You also get gloria from the amenities in your house; you get some gloria per square of area your house covers. Additionally, each obstcle and item is assigned a small gloria per day value, and you get this as long as that obstacle or item is in your house. Items can be bought or sold for gloria.


Bags of holding:
  - You put the bag of holding into itself and it disappears...
  - Interdimensional energies twist as you put the bag of holding into the bag of holding. Your bag of holding is shredded!

THE SKILL TREES
===============

Human
  - Nobility: Buff to Gloria generation
    - Heroism: Take twice as much Gloria as the rest of the party

Elf
  - Forestry 1: See through trees
    - Forestry 2: Bows shoot through trees
      - Forestry 3: Move through trees
  - Infravision: See in the dark

Dwarf
  - Stone skin: Buff vs physical damage when near Stone obstacles
  - Infravision: See in the dark

Gnome
  - Infravision: See in the dark

Halfling
  - Song: Provides buff to all stats (CON, INT, POW, STR, CHA) of Friendly mobs in the area when idle
  - Infravision: See in the dark

Half-Orc
  - Bash: Adds extra attack roll to all attacks

Magic
  Requires general Magic skill:
  - Meditation: MP regen increased when idling
    - Concentration: MP regen increased after spellcasting
      - Focus: Regenerates MP when you take damage
        - Carnal Delight: Regenerates MP when you kill Hostile mobs
      - Mental Link: MP regen increased when around Friendly mobs
        - Soul Siphon: Regenerates MP whenever any Friendy mob takes damage near you

  Requires respective Elemental skills:
  - Mastery of Water: Swimming speed increased by 25%
    - Affinity for Water: HP and MP regen increased in water
  - Mastery of Fire: Take no damage when On Fire (possessions my still burn)
    - Affinity for Fire: HP and MP regen in increased when On Fire
  - Mastery of Air: All movement speed increased by 10%
    - Affinity for Air: All HP and MP regen increased
  - Mastery of Earth: All mining speed increased by 10%
    - Affinity for Earth: HP and MP regen increased when on Dirt, Stone, or Grass tiles

  Requires Mind skill:
  - Telepathy: See some mobs even if they are behind obstacles
    - Aura of Pain: All mobs in field of vision take slow damage
    - Aura of Fear: Nearby Hostile mobs roll as if Scare Monster every second
    - Aura of Focus: All friendly mobs in field of vision get increased HP and MP regen

  Requires Conveyance skill:
  - Blink: Automatically teleport away when HP is low

  Requires Matter skill:
  - Micro-Shapeshifting: Adds an additional saving throw to all physical hits
    - Redirection: Adds an additional saving throw to all physical hits

  Requires Healing skill:
  - Anatomy: Bonus to and against all physical damage
    - Nutrition: Food and potions heal +25%
    - Lifestyle: CON and STR exercised 25% faster

Fighting
