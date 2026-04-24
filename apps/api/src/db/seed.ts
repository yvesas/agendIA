import 'dotenv/config';

import bcrypt from 'bcrypt';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as schema from './schema';
import { type NewExam } from './schema/exams';

const DEFAULT_SALT_ROUNDS = 12;

const DEMO_USER = {
  name: 'Demo User',
  email: 'demo@agendia.app',
  password: 'Agendia@123',
};

const EXAMS: NewExam[] = [
  {
    name: 'Hemograma Completo',
    slug: 'hemograma-completo',
    description: 'Avaliação geral das células do sangue (eritrócitos, leucócitos e plaquetas).',
    preparation: null,
    durationMin: 10,
    priceCents: 3500,
  },
  {
    name: 'Glicemia em Jejum',
    slug: 'glicemia-em-jejum',
    description: 'Medida do nível de glicose no sangue após período de jejum.',
    preparation: 'Jejum de 8 horas. Água está liberada.',
    durationMin: 10,
    priceCents: 2000,
  },
  {
    name: 'Hemoglobina Glicada (HbA1c)',
    slug: 'hemoglobina-glicada',
    description: 'Média do controle glicêmico nos últimos 2 a 3 meses.',
    preparation: null,
    durationMin: 10,
    priceCents: 6500,
  },
  {
    name: 'Colesterol Total e Frações',
    slug: 'colesterol-total-e-fracoes',
    description: 'Perfil lipídico com colesterol total, HDL, LDL e não-HDL.',
    preparation: 'Jejum de 12 horas recomendado para melhor precisão.',
    durationMin: 10,
    priceCents: 4500,
  },
  {
    name: 'Triglicerídeos',
    slug: 'triglicerides',
    description: 'Dosagem de triglicerídeos no sangue.',
    preparation: 'Jejum de 12 horas.',
    durationMin: 10,
    priceCents: 3000,
  },
  {
    name: 'TSH — Hormônio Tireoestimulante',
    slug: 'tsh',
    description: 'Triagem principal da função tireoidiana.',
    preparation: null,
    durationMin: 10,
    priceCents: 5000,
  },
  {
    name: 'T4 Livre',
    slug: 't4-livre',
    description: 'Dosagem da fração livre de tiroxina para avaliação da tireoide.',
    preparation: null,
    durationMin: 10,
    priceCents: 5000,
  },
  {
    name: 'Vitamina D (25-OH)',
    slug: 'vitamina-d-25-oh',
    description: 'Dosagem da forma circulante da vitamina D.',
    preparation: null,
    durationMin: 10,
    priceCents: 12000,
  },
  {
    name: 'Vitamina B12',
    slug: 'vitamina-b12',
    description: 'Dosagem de cobalamina sérica.',
    preparation: null,
    durationMin: 10,
    priceCents: 8000,
  },
  {
    name: 'Ureia e Creatinina',
    slug: 'ureia-e-creatinina',
    description: 'Avaliação da função renal.',
    preparation: null,
    durationMin: 10,
    priceCents: 4000,
  },
  {
    name: 'TGO e TGP (AST/ALT)',
    slug: 'tgo-e-tgp',
    description: 'Enzimas hepáticas usadas na avaliação da saúde do fígado.',
    preparation: null,
    durationMin: 10,
    priceCents: 4000,
  },
  {
    name: 'Exame de Urina Tipo I (EAS)',
    slug: 'urina-tipo-1',
    description: 'Análise física, química e microscópica da urina.',
    preparation: 'Coletar preferencialmente a primeira urina da manhã em frasco estéril.',
    durationMin: 5,
    priceCents: 3000,
  },
];

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to run the seed.');
  }

  const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? DEFAULT_SALT_ROUNDS);

  const client = postgres(databaseUrl, { max: 1 });
  const db = drizzle(client, { schema });

  try {
    await db.insert(schema.exams).values(EXAMS).onConflictDoNothing({
      target: schema.exams.slug,
    });

    const passwordHash = await bcrypt.hash(DEMO_USER.password, saltRounds);
    await db
      .insert(schema.users)
      .values({
        name: DEMO_USER.name,
        email: DEMO_USER.email,
        passwordHash,
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: { name: DEMO_USER.name, passwordHash, updatedAt: new Date() },
      });

    console.log(`Seed complete: ${EXAMS.length} exams and 1 demo user ensured.`);
    console.log(`Demo credentials: ${DEMO_USER.email} / ${DEMO_USER.password}`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exit(1);
});
