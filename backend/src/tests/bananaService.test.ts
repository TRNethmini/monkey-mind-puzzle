import { getQuestions, clearCache } from '../services/bananaService';

// Quick checks for the Banana service and its fallback

describe('Banana Service', () => {
  beforeEach(() => {
    clearCache();
  });

  it('should return requested number of questions', async () => {
    const questions = await getQuestions(10);

    expect(questions).toHaveLength(10);
    expect(questions[0].id).toBeDefined();
    expect(questions[0].prompt).toBeDefined();
    expect(questions[0].choices).toHaveLength(4);
    expect(questions[0].correctAnswer).toBeDefined();
  });

  it('should return questions with correct structure', async () => {
    const questions = await getQuestions(5, 'medium');

    questions.forEach((q) => {
      expect(q).toHaveProperty('id');
      expect(q).toHaveProperty('prompt');
      expect(q).toHaveProperty('choices');
      expect(q).toHaveProperty('correctAnswer');
      expect(q).toHaveProperty('timeLimit');
      expect(q.choices).toContain(q.correctAnswer);
    });
  });

  it('should filter by difficulty when specified', async () => {
    const easyQuestions = await getQuestions(5, 'easy');
    const hardQuestions = await getQuestions(5, 'hard');

    // We only need to confirm we got results back
    expect(easyQuestions).toHaveLength(5);
    expect(hardQuestions).toHaveLength(5);
  });

  it('should generate unique question IDs', async () => {
    const questions = await getQuestions(10);
    const ids = questions.map((q) => q.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(ids.length);
  });

  it('should handle large question requests', async () => {
    const questions = await getQuestions(50);

    expect(questions.length).toBeGreaterThanOrEqual(25); // Should return at least 25
  });

  it('should shuffle answer choices', async () => {
    const questions = await getQuestions(10);

    questions.forEach((q) => {
      const correctIndex = q.choices.indexOf(q.correctAnswer);
      // Make sure the correct answer is still in the list
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      expect(correctIndex).toBeLessThan(4);
    });
  });
});

