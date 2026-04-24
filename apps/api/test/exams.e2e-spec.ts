import request from 'supertest';

import { createTestApp, type TestAppContext } from './helpers/app';
import { truncateAll } from './helpers/db-cleanup';
import { seedExam } from './helpers/factories';

describe('Exams (e2e)', () => {
  let ctx: TestAppContext;

  beforeAll(async () => {
    ctx = await createTestApp();
  });

  beforeEach(async () => {
    await truncateAll(ctx.db);
  });

  afterAll(async () => {
    await ctx.app.close();
  });

  describe('GET /exams', () => {
    it('lista paginada com meta', async () => {
      await seedExam(ctx.db, { slug: 'hemograma', name: 'Hemograma' });
      await seedExam(ctx.db, { slug: 'glicemia', name: 'Glicemia' });

      const response = await request(ctx.app.getHttpServer()).get('/exams').expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.meta).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('filtra por search', async () => {
      await seedExam(ctx.db, { slug: 'hemograma', name: 'Hemograma' });
      await seedExam(ctx.db, { slug: 'glicemia', name: 'Glicemia em Jejum' });

      const response = await request(ctx.app.getHttpServer())
        .get('/exams?search=glicemia')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].slug).toBe('glicemia');
    });

    it('respeita paginação (page, limit)', async () => {
      for (let i = 0; i < 3; i++) {
        await seedExam(ctx.db, { slug: `exam-${i}`, name: `Exam ${i}` });
      }

      const response = await request(ctx.app.getHttpServer())
        .get('/exams?page=2&limit=2')
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.meta).toMatchObject({ page: 2, limit: 2, total: 3, totalPages: 2 });
    });
  });

  describe('GET /exams/:id', () => {
    it('retorna o exame por id', async () => {
      const exam = await seedExam(ctx.db, { slug: 'detail-1' });

      const response = await request(ctx.app.getHttpServer())
        .get(`/exams/${exam.id}`)
        .expect(200);

      expect(response.body.id).toBe(exam.id);
      expect(response.body.slug).toBe('detail-1');
    });

    it('404 quando não existe', async () => {
      await request(ctx.app.getHttpServer())
        .get('/exams/11111111-2222-4333-8444-555555555555')
        .expect(404);
    });
  });
});
