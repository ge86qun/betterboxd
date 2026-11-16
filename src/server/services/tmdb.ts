const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TmdbMovieSummary {
  tmdbId: number;
  title: string;
  overview: string;
  releaseDate: string | null;
  releaseYear: number | null;
  posterPath: string | null;
  posterUrl: string | null;
  backdropPath: string | null;
  backdropUrl: string | null;
  voteAverage: number;
}

export interface TmdbMovieDetail extends TmdbMovieSummary {
  tagline: string | null;
  runtime: number | null;
  genres: { id: number; name: string }[];
  directors: { id: number; name: string; profileUrl: string | null }[];
  cast: {
    id: number;
    name: string;
    character: string;
    profileUrl: string | null;
  }[];
}

// Fallback demo movies when TMDB_API_KEY is not configured yet, so development/testing works out-of-the-box.
const FALLBACK_MOVIES: Record<number, TmdbMovieDetail> = {
  27205: {
    tmdbId: 27205,
    title: 'Inception',
    tagline: 'Your mind is the scene of the crime.',
    overview:
      'Cobb, a skilled thief who commits corporate espionage by infiltrating the subconscious of his targets is offered a chance to regain his old life as payment for a task considered to be impossible: "inception", the implantation of another person\'s idea into a target\'s subconscious.',
    releaseDate: '2010-07-15',
    releaseYear: 2010,
    runtime: 148,
    posterPath: '/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    backdropPath: '/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg',
    voteAverage: 8.4,
    genres: [
      { id: 28, name: 'Action' },
      { id: 878, name: 'Science Fiction' },
      { id: 12, name: 'Adventure' },
    ],
    directors: [{ id: 525, name: 'Christopher Nolan', profileUrl: null }],
    cast: [
      { id: 6193, name: 'Leonardo DiCaprio', character: 'Dom Cobb', profileUrl: null },
      { id: 24045, name: 'Joseph Gordon-Levitt', character: 'Arthur', profileUrl: null },
      { id: 27578, name: 'Elliot Page', character: 'Ariadne', profileUrl: null },
    ],
  },
  157336: {
    tmdbId: 157336,
    title: 'Interstellar',
    tagline: 'Mankind was born on Earth. It was never meant to die here.',
    overview:
      'The adventures of a group of explorers who make use of a newly discovered wormhole to surpass the limitations on human space travel and conquer the vast distances involved in an interstellar voyage.',
    releaseDate: '2014-11-05',
    releaseYear: 2014,
    runtime: 169,
    posterPath: '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
    backdropPath: '/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg',
    voteAverage: 8.4,
    genres: [
      { id: 12, name: 'Adventure' },
      { id: 18, name: 'Drama' },
      { id: 878, name: 'Science Fiction' },
    ],
    directors: [{ id: 525, name: 'Christopher Nolan', profileUrl: null }],
    cast: [
      { id: 10297, name: 'Matthew McConaughey', character: 'Cooper', profileUrl: null },
      { id: 1813, name: 'Anne Hathaway', character: 'Brand', profileUrl: null },
      { id: 83002, name: 'Jessica Chastain', character: 'Murph', profileUrl: null },
    ],
  },
  496243: {
    tmdbId: 496243,
    title: 'Parasite',
    tagline: 'Act like you own the place.',
    overview:
      'All unemployed, Ki-taek\'s family takes peculiar interest in the wealthy and glamorous Parks for their livelihood until they get entangled in an unexpected incident.',
    releaseDate: '2019-05-30',
    releaseYear: 2019,
    runtime: 133,
    posterPath: '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
    backdropPath: '/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoHshkFcQUCG.jpg',
    voteAverage: 8.5,
    genres: [
      { id: 35, name: 'Comedy' },
      { id: 53, name: 'Thriller' },
      { id: 18, name: 'Drama' },
    ],
    directors: [{ id: 21684, name: 'Bong Joon-ho', profileUrl: null }],
    cast: [
      { id: 20738, name: 'Song Kang-ho', character: 'Kim Ki-taek', profileUrl: null },
      { id: 115292, name: 'Lee Sun-kyun', character: 'Park Dong-ik', profileUrl: null },
      { id: 556435, name: 'Cho Yeo-jeong', character: 'Choi Yeon-gyo', profileUrl: null },
    ],
  },
  545611: {
    tmdbId: 545611,
    title: 'Everything Everywhere All at Once',
    tagline: 'The universe is so much bigger than you realize.',
    overview:
      'An aging Chinese immigrant is swept up in an insane adventure, where she alone can save what\'s important to her by connecting with the lives she could have led in other universes.',
    releaseDate: '2022-03-24',
    releaseYear: 2022,
    runtime: 140,
    posterPath: '/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg',
    backdropPath: '/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/ss0Os3uWJfQAENILHZUdX8Tt1OC.jpg',
    voteAverage: 7.8,
    genres: [
      { id: 28, name: 'Action' },
      { id: 12, name: 'Adventure' },
      { id: 878, name: 'Science Fiction' },
    ],
    directors: [
      { id: 1383612, name: 'Daniel Kwan', profileUrl: null },
      { id: 1383613, name: 'Daniel Scheinert', profileUrl: null },
    ],
    cast: [
      { id: 1620, name: 'Michelle Yeoh', character: 'Evelyn Wang', profileUrl: null },
      { id: 690, name: 'Ke Huy Quan', character: 'Waymond Wang', profileUrl: null },
      { id: 1972974, name: 'Stephanie Hsu', character: 'Joy Wang / Jobu Tupaki', profileUrl: null },
    ],
  },
  693134: {
    tmdbId: 693134,
    title: 'Dune: Part Two',
    tagline: 'Long live the fighters.',
    overview:
      'Follow the mythic journey of Paul Atreides as he unites with Chani and the Fremen while on a path of revenge against the conspirators who destroyed his family.',
    releaseDate: '2024-02-27',
    releaseYear: 2024,
    runtime: 167,
    posterPath: '/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
    backdropPath: '/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg',
    voteAverage: 8.3,
    genres: [
      { id: 878, name: 'Science Fiction' },
      { id: 12, name: 'Adventure' },
    ],
    directors: [{ id: 137427, name: 'Denis Villeneuve', profileUrl: null }],
    cast: [
      { id: 1190668, name: 'Timothée Chalamet', character: 'Paul Atreides', profileUrl: null },
      { id: 505710, name: 'Zendaya', character: 'Chani', profileUrl: null },
      { id: 933238, name: 'Rebecca Ferguson', character: 'Lady Jessica', profileUrl: null },
    ],
  },
  120467: {
    tmdbId: 120467,
    title: 'The Grand Budapest Hotel',
    tagline: 'A murder case of Madam D. With enormous wealth and the most outrageous events surrounding her sudden death!',
    overview:
      'The Grand Budapest Hotel tells of a legendary concierge at a famous European hotel between the wars and his friendship with a young employee who becomes his trusted protégé.',
    releaseDate: '2014-02-26',
    releaseYear: 2014,
    runtime: 100,
    posterPath: '/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    posterUrl: 'https://image.tmdb.org/t/p/w500/eWdyYQreja6JGCzqHWXpWHDrrPo.jpg',
    backdropPath: '/xHDynIimfsgj0ZOs0j5ma8v1vmM.jpg',
    backdropUrl: 'https://image.tmdb.org/t/p/w1280/xHDynIimfsgj0ZOs0j5ma8v1vmM.jpg',
    voteAverage: 8.1,
    genres: [
      { id: 35, name: 'Comedy' },
      { id: 18, name: 'Drama' },
    ],
    directors: [{ id: 5655, name: 'Wes Anderson', profileUrl: null }],
    cast: [
      { id: 5469, name: 'Ralph Fiennes', character: 'M. Gustave', profileUrl: null },
      { id: 1315036, name: 'Tony Revolori', character: 'Zero', profileUrl: null },
      { id: 36592, name: 'Saoirse Ronan', character: 'Agatha', profileUrl: null },
    ],
  },
};

function getTmdbCredentials(): { apiKey?: string; bearerToken?: string } {
  const raw = process.env.TMDB_API_KEY?.trim();
  const bearer = process.env.TMDB_READ_ACCESS_TOKEN?.trim();
  if (bearer) return { bearerToken: bearer };
  if (!raw) return {};
  // TMDB v4 Read Access Tokens are JWTs starting with 'eyJ'
  if (raw.startsWith('eyJ')) {
    return { bearerToken: raw };
  }
  return { apiKey: raw };
}

async function tmdbFetch<T>(
  endpoint: string,
  params: Record<string, string | number> = {}
): Promise<T> {
  const { apiKey, bearerToken } = getTmdbCredentials();
  const url = new URL(`${TMDB_BASE_URL}${endpoint}`);

  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  if (apiKey) {
    url.searchParams.set('api_key', apiKey);
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (bearerToken) {
    headers.Authorization = `Bearer ${bearerToken}`;
  }

  const res = await fetch(url.toString(), { headers });
  if (!res.ok) {
    throw new Error(`TMDB API error (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as T;
}

function formatSummary(raw: any): TmdbMovieSummary {
  const releaseDate: string | null = raw.release_date || null;
  const releaseYear = releaseDate ? Number.parseInt(releaseDate.slice(0, 4), 10) || null : null;
  const posterPath: string | null = raw.poster_path || null;
  const backdropPath: string | null = raw.backdrop_path || null;

  return {
    tmdbId: Number(raw.id),
    title: raw.title || raw.original_title || `Movie #${raw.id}`,
    overview: raw.overview || '',
    releaseDate,
    releaseYear,
    posterPath,
    posterUrl: posterPath ? `${TMDB_IMAGE_BASE}/w500${posterPath}` : null,
    backdropPath,
    backdropUrl: backdropPath ? `${TMDB_IMAGE_BASE}/w1280${backdropPath}` : null,
    voteAverage: typeof raw.vote_average === 'number' ? Math.round(raw.vote_average * 10) / 10 : 0,
  };
}

export async function searchTmdbMovies(
  query: string,
  page = 1
): Promise<{
  results: TmdbMovieSummary[];
  page: number;
  totalPages: number;
  totalResults: number;
  usingFallback: boolean;
}> {
  const { apiKey, bearerToken } = getTmdbCredentials();
  if (!apiKey && !bearerToken) {
    const q = query.toLowerCase().trim();
    const matches = Object.values(FALLBACK_MOVIES).filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.overview.toLowerCase().includes(q)
    );
    return {
      results: matches,
      page: 1,
      totalPages: 1,
      totalResults: matches.length,
      usingFallback: true,
    };
  }

  const data = await tmdbFetch<any>('/search/movie', {
    query,
    page,
    include_adult: 'false',
    language: 'en-US',
  });

  return {
    results: (data.results || []).map(formatSummary),
    page: data.page || 1,
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
    usingFallback: false,
  };
}

export async function getTrendingTmdbMovies(
  window: 'day' | 'week' = 'week',
  page = 1
): Promise<{
  results: TmdbMovieSummary[];
  page: number;
  totalPages: number;
  usingFallback: boolean;
}> {
  const { apiKey, bearerToken } = getTmdbCredentials();
  if (!apiKey && !bearerToken) {
    return {
      results: Object.values(FALLBACK_MOVIES),
      page: 1,
      totalPages: 1,
      usingFallback: true,
    };
  }

  const data = await tmdbFetch<any>(`/trending/movie/${window}`, {
    page,
    language: 'en-US',
  });

  return {
    results: (data.results || []).map(formatSummary),
    page: data.page || 1,
    totalPages: data.total_pages || 1,
    usingFallback: false,
  };
}

export async function getTmdbMovieDetail(tmdbId: number): Promise<TmdbMovieDetail> {
  const { apiKey, bearerToken } = getTmdbCredentials();
  if (!apiKey && !bearerToken) {
    if (FALLBACK_MOVIES[tmdbId]) {
      return FALLBACK_MOVIES[tmdbId];
    }
    return {
      tmdbId,
      title: `Movie #${tmdbId}`,
      tagline: null,
      overview: 'Set TMDB_API_KEY in .env to fetch live movie metadata from The Movie Database.',
      releaseDate: null,
      releaseYear: null,
      runtime: null,
      posterPath: null,
      posterUrl: null,
      backdropPath: null,
      backdropUrl: null,
      voteAverage: 0,
      genres: [],
      directors: [],
      cast: [],
    };
  }

  try {
    const raw = await tmdbFetch<any>(`/movie/${tmdbId}`, {
      append_to_response: 'credits',
      language: 'en-US',
    });

    const summary = formatSummary(raw);
    const crew: any[] = raw.credits?.crew || [];
    const cast: any[] = raw.credits?.cast || [];

    const directors = crew
      .filter((c) => c.job === 'Director')
      .map((d) => ({
        id: Number(d.id),
        name: d.name,
        profileUrl: d.profile_path ? `${TMDB_IMAGE_BASE}/w185${d.profile_path}` : null,
      }));

    const topCast = cast.slice(0, 12).map((c) => ({
      id: Number(c.id),
      name: c.name,
      character: c.character || '',
      profileUrl: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null,
    }));

    return {
      ...summary,
      tagline: raw.tagline || null,
      runtime: typeof raw.runtime === 'number' ? raw.runtime : null,
      genres: Array.isArray(raw.genres)
        ? raw.genres.map((g: any) => ({ id: Number(g.id), name: g.name }))
        : [],
      directors,
      cast: topCast,
    };
  } catch {
    if (FALLBACK_MOVIES[tmdbId]) {
      return FALLBACK_MOVIES[tmdbId];
    }
    return {
      tmdbId,
      title: `Movie #${tmdbId}`,
      tagline: null,
      overview: '',
      releaseDate: null,
      releaseYear: null,
      runtime: null,
      posterPath: null,
      posterUrl: null,
      backdropPath: null,
      backdropUrl: null,
      voteAverage: 0,
      genres: [],
      directors: [],
      cast: [],
    };
  }
}

export async function hydrateTmdbMoviesBatch(
  tmdbIds: number[]
): Promise<Record<number, TmdbMovieSummary>> {
  const uniqueIds = Array.from(new Set(tmdbIds.filter((id) => Number.isInteger(id) && id > 0)));
  const result: Record<number, TmdbMovieSummary> = {};

  await Promise.all(
    uniqueIds.map(async (id) => {
      const detail = await getTmdbMovieDetail(id);
      result[id] = {
        tmdbId: detail.tmdbId,
        title: detail.title,
        overview: detail.overview,
        releaseDate: detail.releaseDate,
        releaseYear: detail.releaseYear,
        posterPath: detail.posterPath,
        posterUrl: detail.posterUrl,
        backdropPath: detail.backdropPath,
        backdropUrl: detail.backdropUrl,
        voteAverage: detail.voteAverage,
      };
    })
  );

  return result;
}
