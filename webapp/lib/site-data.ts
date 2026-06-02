export const navigation = [
  { href: "/story", label: "Story" },
  { href: "/collection", label: "Collection" },
  { href: "/migration", label: "Migration" },
] as const;

export const punkAsset = (tokenId: number) => `/punks/punk${tokenId}.png`;

export const heroPunks = [
  { tokenId: 10006, className: "p1", delay: 0 },
  { tokenId: 12238, className: "p2", delay: 0.7 },
  { tokenId: 18108, className: "p3", delay: 0.3 },
  { tokenId: 10031, className: "p4", delay: 0.9 },
  { tokenId: 11177, className: "p5", delay: 0.55 },
  { tokenId: 14857, className: "p6", delay: 0.15 },
] as const;

export const galleryTokenIds = [
  10000, 10001, 10002, 10003, 10004, 10005, 10007, 10008, 10009, 10010,
] as const;

// Showcase grid: mostly the punks the original Punkverse could not make.
// CryptoPunks locked traits by gender (hats like Top Hat / Cowboy Hat / Fedora
// were male-only) and had no Non-Binary type. These xPunks break both rules:
// women in those hats, and a type that cross-codes gendered traits. A few
// rares and attribute grails round it out. All verified against
// .context/data/token-metadata.json.
export const featuredPunks = [
  { tokenId: 10083, tag: "Top Hat" }, // Light Female in a top hat
  { tokenId: 10164, tag: "Tiara" }, // Male in a tiara
  { tokenId: 10741, tag: "Alien" }, // rare type
  { tokenId: 10039, tag: "Cowboy Hat" }, // Light Female
  { tokenId: 10825, tag: "Hot Lipstick" }, // Male, red mohawk + hot lipstick
  { tokenId: 10013, tag: "Non-Binary" }, // Medium female face + Big Beard
  { tokenId: 10092, tag: "Ape" }, // Ape Female in a fedora + gold chain
  { tokenId: 11305, tag: "Non-Binary" }, // Dark male, blonde bob + beard + eye patch
  { tokenId: 10502, tag: "Zombie" }, // Zombie Female in a police cap + black lipstick
  { tokenId: 10237, tag: "8 traits" }, // most-loaded punk
] as const;

// Verified against .context/data/token-metadata.json (typeCounts), rarest first.
export const punkTypes = [
  { name: "Alien", count: 10, note: "The rarest face in the set.", rare: true },
  { name: "Ape", count: 23, note: "Brown apes, straight from the Punkverse.", rare: true },
  { name: "Zombie", count: 96, note: "Green, undead, and hard to find.", rare: true },
  { name: "Non-Binary", count: 214, note: "A type the original Punkverse never had.", rare: false },
  { name: "Male", count: 3725, note: "", rare: false },
  { name: "Female", count: 5932, note: "The most common type, which is rather the point.", rare: false },
] as const;

export const executionStages = [
  { name: "Approved", detail: "XIPs passed", status: "complete" },
  { name: "Verify 10k", detail: "We are here", status: "active" },
  { name: "Preflight", detail: "Review", status: "open" },
  { name: "Launch", detail: "Migration begins", status: "open" },
  { name: "Wind-down", detail: "Rewards + grants", status: "open" },
] as const;

export const historyMoments = [
  {
    label: "2021",
    copy: "10,000 xPunks launch as a more representative expansion of the Punkverse.",
    highlight: false,
  },
  {
    label: "ExpansionDAO",
    copy: "Holders guide treasury, culture, community initiatives and hard tradeoffs.",
    highlight: false,
  },
  {
    label: "2026",
    copy: "The community approves onchain migration and a deliberate DAO wind-down.",
    highlight: true,
  },
  {
    label: "Next",
    copy: "The collection moves toward a permanent onchain home.",
    highlight: false,
  },
] as const;

export const snapshotLinks = {
  xip24:
    "https://snapshot.org/#/s:expansiondao.eth/proposal/0xa9c1feaca3f1b313e599a477bfba53211316e5f890de4c6c14ae782d8a82f782",
  xip25:
    "https://snapshot.org/#/s:expansiondao.eth/proposal/0x9f9223a38b26a9a1aaf1069db234290a95e4c5885263c12512968b9b0cc58ecb",
} as const;

export const discordDiscussionLinks = {
  xip24: "https://discord.com/channels/864147158777462854/1475812449805537321",
  xip25: "https://discord.com/channels/864147158777462854/1475812769595916333",
} as const;
