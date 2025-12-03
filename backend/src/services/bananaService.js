import axios from 'axios';
import config from '../config/env.js';
import logger from '../config/logger.js';
import { generateQuestionId } from '../utils/codeGenerator.js';

// Handles pulling puzzles from the Banana API with simple fallbacks

// Backup questions used when the Banana API is down
const FALLBACK_QUESTIONS = [
  {
    type: 'text',
    prompt: 'What is the capital of France?',
    choices: ['London', 'Berlin', 'Paris', 'Madrid'],
    correctAnswer: 'Paris',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Which planet is known as the Red Planet?',
    choices: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
    correctAnswer: 'Mars',
    category: 'Science',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Who painted the Mona Lisa?',
    choices: ['Vincent van Gogh', 'Pablo Picasso', 'Leonardo da Vinci', 'Michelangelo'],
    correctAnswer: 'Leonardo da Vinci',
    category: 'Art',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'What is the largest ocean on Earth?',
    choices: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctAnswer: 'Pacific Ocean',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Which programming language is known as the "language of the web"?',
    choices: ['Python', 'JavaScript', 'Java', 'C++'],
    correctAnswer: 'JavaScript',
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What year did World War II end?',
    choices: ['1943', '1944', '1945', '1946'],
    correctAnswer: '1945',
    category: 'History',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'What is the chemical symbol for gold?',
    choices: ['Go', 'Gd', 'Au', 'Ag'],
    correctAnswer: 'Au',
    category: 'Science',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'Which country is home to the kangaroo?',
    choices: ['New Zealand', 'Australia', 'South Africa', 'Brazil'],
    correctAnswer: 'Australia',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What is the smallest prime number?',
    choices: ['0', '1', '2', '3'],
    correctAnswer: '2',
    category: 'Mathematics',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'Who wrote "Romeo and Juliet"?',
    choices: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 'William Shakespeare',
    category: 'Literature',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What is the speed of light in vacuum?',
    choices: ['299,792 km/s', '300,000 km/s', '150,000 km/s', '450,000 km/s'],
    correctAnswer: '299,792 km/s',
    category: 'Physics',
    difficulty: 'hard',
  },
  {
    type: 'text',
    prompt: 'Which element has the atomic number 1?',
    choices: ['Helium', 'Hydrogen', 'Oxygen', 'Carbon'],
    correctAnswer: 'Hydrogen',
    category: 'Chemistry',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'What is the largest mammal in the world?',
    choices: ['African Elephant', 'Blue Whale', 'Giraffe', 'Polar Bear'],
    correctAnswer: 'Blue Whale',
    category: 'Biology',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'In which year did the first iPhone release?',
    choices: ['2005', '2006', '2007', '2008'],
    correctAnswer: '2007',
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'What is the tallest mountain in the world?',
    choices: ['K2', 'Kangchenjunga', 'Mount Everest', 'Lhotse'],
    correctAnswer: 'Mount Everest',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Which gas do plants absorb from the atmosphere?',
    choices: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Hydrogen'],
    correctAnswer: 'Carbon Dioxide',
    category: 'Biology',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Who developed the theory of relativity?',
    choices: ['Isaac Newton', 'Albert Einstein', 'Galileo Galilei', 'Stephen Hawking'],
    correctAnswer: 'Albert Einstein',
    category: 'Physics',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What is the main programming paradigm of JavaScript?',
    choices: ['Object-oriented', 'Functional', 'Multi-paradigm', 'Procedural'],
    correctAnswer: 'Multi-paradigm',
    category: 'Technology',
    difficulty: 'hard',
  },
  {
    type: 'text',
    prompt: 'How many continents are there?',
    choices: ['5', '6', '7', '8'],
    correctAnswer: '7',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What is the boiling point of water at sea level?',
    choices: ['90°C', '100°C', '110°C', '120°C'],
    correctAnswer: '100°C',
    category: 'Science',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Which programming language is known for its use in data science?',
    choices: ['JavaScript', 'Python', 'C#', 'Ruby'],
    correctAnswer: 'Python',
    category: 'Technology',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'What is the currency of Japan?',
    choices: ['Yuan', 'Won', 'Yen', 'Ringgit'],
    correctAnswer: 'Yen',
    category: 'Geography',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Who is known as the father of computers?',
    choices: ['Alan Turing', 'Charles Babbage', 'John von Neumann', 'Bill Gates'],
    correctAnswer: 'Charles Babbage',
    category: 'Technology',
    difficulty: 'medium',
  },
  {
    type: 'text',
    prompt: 'What is the largest planet in our solar system?',
    choices: ['Saturn', 'Jupiter', 'Uranus', 'Neptune'],
    correctAnswer: 'Jupiter',
    category: 'Science',
    difficulty: 'easy',
  },
  {
    type: 'text',
    prompt: 'Which year did the Berlin Wall fall?',
    choices: ['1987', '1988', '1989', '1990'],
    correctAnswer: '1989',
    category: 'History',
    difficulty: 'medium',
  },
];

// Light cache so we don't hit the API every time
class QuestionCache {
  constructor() {
    this.cache = new Map();
    this.maxAge = 3600000; // 1 hour
  }

  set(key, questions) {
    this.cache.set(key, questions);
    setTimeout(() => this.cache.delete(key), this.maxAge);
  }

  get(key) {
    return this.cache.get(key);
  }

  clear() {
    this.cache.clear();
  }
}

const questionCache = new QuestionCache();

// Pull one puzzle from the Banana API
async function fetchSingleBananaPuzzle() {
  const apiUrl = config.bananaApiUrl || 'https://marcconrad.com/uob/banana/api.php';
  
  try {
    logger.debug(`Fetching puzzle from Banana API: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': 'MonkeyMindGame/1.0'
      }
    });

    if (!response.data) {
      throw new Error('Empty API response');
    }

    const { question, answer, solution } = response.data;

    if (!question) {
      throw new Error('No question URL in response');
    }

    // Some responses use a different field name for the answer
    const correctAnswer = String(answer || solution || '');

    if (!correctAnswer) {
      throw new Error('No answer in response');
    }

    logger.info(`✅ Fetched Banana puzzle: ${question}, answer: ${correctAnswer}`);

    return {
      id: generateQuestionId(),
      type: 'visual',
      questionImageUrl: question,
      correctAnswer: correctAnswer,
      category: 'Visual Puzzle',
      difficulty: 'medium',
      timeLimit: config.questionTimeLimit,
    };
  } catch (error) {
    logger.warn(`⚠️  Banana API request failed: ${error.message}`);
    throw error; // Bubble up so we can fall back later
  }
}

// Call the Banana API several times to build a list
async function fetchFromBananaApi(count, _difficulty) {
  const questions = [];
  const maxRetries = 2;
  
  logger.info(`Fetching ${count} puzzles from Banana API...`);

  for (let i = 0; i < count; i++) {
    let success = false;
    
    for (let retry = 0; retry < maxRetries && !success; retry++) {
      try {
        const puzzle = await fetchSingleBananaPuzzle();
        questions.push(puzzle);
        success = true;
        
        // Pause a bit so we stay polite to the API
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        if (retry === maxRetries - 1) {
          logger.warn(`Failed to fetch puzzle ${i + 1} after ${maxRetries} retries`);
        }
      }
    }
  }

  if (questions.length === 0) {
    logger.warn('Banana API failed completely, using fallback');
    throw new Error('All Banana API requests failed');
  }

  if (questions.length < count) {
    logger.warn(`Only got ${questions.length}/${count} puzzles from Banana API`);
  }

  return questions;
}

// Build a list from the fallback pool
function getFallbackQuestions(count, difficulty) {
  let pool = [...FALLBACK_QUESTIONS];

  // Filter when a difficulty was asked for
  if (difficulty) {
    const filtered = pool.filter((q) => q.difficulty === difficulty);
    if (filtered.length >= count) {
      pool = filtered;
    }
  }

  // Shuffle so the game gets variety
  const shuffled = pool.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Repeat a few if we run short
  while (selected.length < count) {
    selected.push(shuffled[selected.length % shuffled.length]);
  }

  return selected.map((q) => ({
    ...q,
    id: generateQuestionId(),
    timeLimit: config.questionTimeLimit,
  }));
}

// Fetch questions, trying the cache first
export async function getQuestions(
  count = 10,
  difficulty
) {
  const cacheKey = `${count}-${difficulty || 'any'}`;

  // Use cached questions if we have enough
  const cached = questionCache.get(cacheKey);
  if (cached && cached.length >= count) {
    logger.debug(`Using cached questions for ${cacheKey}`);
    return cached.slice(0, count);
  }

  // Otherwise, fetch fresh ones
  logger.debug(`Fetching ${count} questions (difficulty: ${difficulty || 'any'})`);
  const questions = await fetchFromBananaApi(count, difficulty);

  // Save them for next time
  questionCache.set(cacheKey, questions);

  return questions;
}

// Prepare questions before a game starts
export async function prefetchQuestions(
  count,
  difficulty
) {
  try {
    return await getQuestions(count, difficulty);
  } catch (error) {
    logger.error('Failed to prefetch questions:', error);
    return getFallbackQuestions(count, difficulty);
  }
}

// Empty the cache (handy in tests)
export function clearCache() {
  questionCache.clear();
}

