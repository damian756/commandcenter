import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter } as never);

const SITE_CONFIGS = [
  {
    slug: "southportguide",
    name: "Southport Guide",
    domain: "southportguide.co.uk",
    network: "sefton",
    type: "directory",
    statsApiUrl: "https://www.southportguide.co.uk/api/command-centre/stats",
    deepApiUrl: "https://www.southportguide.co.uk/api/command-centre/deep-analytics",
    apiKey: process.env.STATS_API_KEY_SOUTHPORTGUIDE ?? "placeholder",
    hasRevenue: true,
    hasListings: true,
  },
  {
    slug: "lakesguide",
    name: "The Lakes Guide",
    domain: "thelakesguide.co.uk",
    network: "lakes",
    type: "directory",
    statsApiUrl: "https://thelakesguide.co.uk/api/command-centre/stats",
    deepApiUrl: "https://thelakesguide.co.uk/api/command-centre/deep-analytics",
    apiKey: process.env.STATS_API_KEY_LAKESGUIDE ?? "placeholder",
    hasRevenue: true,
    hasListings: true,
  },
  {
    slug: "formbyguide",
    name: "Formby Guide",
    domain: "formbyguide.co.uk",
    network: "sefton",
    type: "directory",
    statsApiUrl: "https://www.formbyguide.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_FORMBYGUIDE ?? "placeholder",
    hasRevenue: true,
    hasListings: true,
  },
  {
    slug: "seftoncoastwildlife",
    name: "Sefton Coast Wildlife",
    domain: "seftoncoastwildlife.co.uk",
    network: "sefton",
    type: "wildlife",
    statsApiUrl: "https://seftoncoastwildlife.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_SCW ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "seftonlinks",
    name: "Sefton Links",
    domain: "seftonlinks.com",
    network: "sefton",
    type: "golf",
    statsApiUrl: "https://seftonlinks.com/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_SL ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "hikethelakes",
    name: "Hike The Lakes",
    domain: "hikethelakes.com",
    network: "lakes",
    type: "content",
    statsApiUrl: "https://hikethelakes.com/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_HTL ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "lakeswildlife",
    name: "The Lakes Wildlife",
    domain: "thelakeswildlife.co.uk",
    network: "lakes",
    type: "wildlife",
    statsApiUrl: "https://thelakeswildlife.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_LW ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "forefrontimaging",
    name: "Forefront Imaging / StreamKit",
    domain: "streamkit.co.uk",
    network: "side-venture",
    type: "ecommerce",
    statsApiUrl: "https://streamkit.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_FI ?? "placeholder",
    hasRevenue: true,
    hasListings: false,
  },
  {
    slug: "churchtownmedia",
    name: "Churchtown Media",
    domain: "churchtownmedia.co.uk",
    network: "agency",
    type: "content",
    statsApiUrl: "https://www.churchtownmedia.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_CM ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "seftoncoastnetwork",
    name: "Sefton Coast Network",
    domain: "seftoncoast.network",
    network: "sefton",
    type: "content",
    statsApiUrl: "https://seftoncoast.network/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_SCN ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
  {
    slug: "alotek",
    name: "Alotek Shelters",
    domain: "alotekshelters.co.uk",
    network: "client",
    type: "ecommerce",
    statsApiUrl: "https://www.alotekshelters.co.uk/api/command-centre/stats",
    deepApiUrl: null,
    apiKey: process.env.STATS_API_KEY_ALOTEK ?? "placeholder",
    hasRevenue: false,
    hasListings: false,
  },
];

const STREAKS = [
  { type: "outreach", currentRun: 0, longestRun: 0 },
  { type: "publishing", currentRun: 0, longestRun: 0 },
  { type: "revenue-growth", currentRun: 0, longestRun: 0 },
  { type: "follow-up", currentRun: 0, longestRun: 0 },
];

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@churchtownmedia.co.uk";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "changeme";

  const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingUser) {
    const hashed = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashed,
        name: "Command Centre Admin",
        role: "admin",
      },
    });
    console.log("Created admin user:", adminEmail);
  }

  for (const config of SITE_CONFIGS) {
    await prisma.siteConfig.upsert({
      where: { slug: config.slug },
      create: config,
      update: config,
    });
  }
  console.log("Seeded", SITE_CONFIGS.length, "SiteConfigs");

  for (const streak of STREAKS) {
    await prisma.streak.upsert({
      where: { type: streak.type },
      create: streak,
      update: {},
    });
  }
  console.log("Seeded", STREAKS.length, "Streaks");

  const templates = [
    {
      name: "Claim invite",
      subject: "Claim your listing on Southport Guide",
      body: "<p>Hi {{contactName}},</p><p>We noticed your business is listed on Southport Guide. Would you like to claim it and manage your listing?</p><p>Best,<br/>The Southport Guide team</p>",
      brand: "southportguide",
      stage: "claim",
    },
    {
      name: "Churchtown Media intro",
      subject: "Churchtown Media – local digital marketing",
      body: "<p>Hi {{contactName}},</p><p>I run Churchtown Media, the team behind Southport Guide. We help local businesses with SEO and digital presence.</p><p>Would you be open to a quick chat?</p><p>Damian</p>",
      brand: "churchtownmedia",
      stage: "intro",
    },
  ];

  for (const t of templates) {
    const existing = await prisma.emailTemplate.findFirst({ where: { name: t.name } });
    if (!existing) {
      await prisma.emailTemplate.create({ data: t });
    }
  }
  console.log("Seeded email templates");

  const projects = [
    {
      name: "Alotek Shelters",
      clientName: "Alotek",
      type: "seo-retainer",
      status: "active",
      monthlyFee: 400,
      startDate: new Date("2025-01-01"),
    },
    {
      name: "StreamKit / Forefront Imaging",
      clientName: "Forefront Imaging",
      type: "side-venture",
      status: "active",
      liveUrl: "https://streamkit.co.uk",
    },
  ];

  for (const p of projects) {
    const existing = await prisma.project.findFirst({
      where: { name: p.name },
    });
    if (!existing) {
      const proj = await prisma.project.create({ data: p });
      if (p.name === "Alotek Shelters") {
        const rmExists = await prisma.retainerMonth.findFirst({
          where: { projectId: proj.id, month: "2026-03" },
        });
        if (!rmExists) {
          await prisma.retainerMonth.create({
            data: {
              projectId: proj.id,
              month: "2026-03",
              agreedBlogPosts: 2,
              agreedPagesCreated: 0,
            },
          });
        }
      }
    }
  }
  console.log("Seeded projects");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
