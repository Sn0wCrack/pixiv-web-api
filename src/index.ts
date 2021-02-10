import got, { Response } from 'got/dist/source';
import { Cookie, CookieJar } from 'tough-cookie';
import cheerio from 'cheerio';
import UserAgent from 'user-agents';
import {
  IllustDetailsResponse,
  IllustPagesResponse,
  LoginResponse,
  UgoiraMetaDataResponse,
} from './ResponseTypes';
import { AuthData, Options } from './ApiTypes';

const BASE_URL = 'https://www.pixiv.net';
const LOGIN_PAGE_URL = 'https://accounts.pixiv.net/login';
const LOGIN_API_URL = 'https://accounts.pixiv.net/api/login';
const WEB_API_URL = 'https://www.pixiv.net/ajax';

class PixivWeb {
  private username: string | undefined;
  private password: string | undefined;
  private sessionCookie: string | undefined;

  private locale: string | undefined;
  private userAgent: string | undefined;

  private cookieJar: CookieJar;

  private userId: string | undefined;

  constructor(auth?: AuthData, options?: Options) {
    this.username = auth?.username;
    this.password = auth?.password;
    this.sessionCookie = auth?.cookie;

    this.locale = options?.locale ?? 'en';
    this.userAgent = options?.userAgent ?? this.defaultUserAgent();

    this.cookieJar = new CookieJar();

    if (this.sessionCookie) {
      const cookies = this.makeSessionCookies();

      for (const cookie of cookies) {
        this.cookieJar.setCookieSync(cookie, BASE_URL);
      }
    }
  }

  async login(auth?: AuthData) {
    this.username = auth?.username ?? this.username;
    this.password = auth?.password ?? this.password;
    this.sessionCookie = auth?.cookie ?? this.sessionCookie;

    if (this.sessionCookie) {
      return await this.cookieLogin();
    } else {
      return await this.formLogin();
    }
  }

  private async cookieLogin() {
    const cookies = this.makeSessionCookies();

    for (const cookie of cookies) {
      await this.cookieJar.setCookie(cookie, BASE_URL);
    }

    const { body } = await got.get(BASE_URL, {
      headers: {
        'User-Agent': this.userAgent,
      },
      cookieJar: this.cookieJar,
    });

    const result =
      body.includes('logout.php') ||
      body.includes('pixiv.user.loggedIn = true') ||
      body.includes("_gaq.push(['_setCustomVar', 1, 'login', 'yes'") ||
      body.includes("var dataLayer = [{ login: 'yes',");

    if (result) {
      await this.findUserId(body);
    }

    return result
      ? Promise.resolve()
      : Promise.reject('Failed to login using Cookie Authentication');
  }

  private async formLogin(): Promise<boolean> {
    const loginPage = await got.get(LOGIN_PAGE_URL, {
      headers: {
        'User-Agent': this.userAgent,
      },
      cookieJar: this.cookieJar,
    });

    const $ = cheerio.load(loginPage.body);
    const postKey = $('input[name="post_key"]');

    const data = {
      pixiv_id: this.username,
      password: this.password,
      return_to: BASE_URL,
      lang: this.locale,
      post_key: postKey.val(),
      source: 'accounts',
      ref: '',
    };

    const loginResponse: LoginResponse = await got
      .post(LOGIN_API_URL, {
        headers: {
          'User-Agent': this.userAgent,
        },
        form: data,
        searchParams: { lang: this.locale },
        cookieJar: this.cookieJar,
        responseType: 'json',
      })
      .json();

    if (loginResponse?.error || loginResponse?.body?.validation_errors) {
      return Promise.resolve(false);
    }

    const cookies = await this.cookieJar.getCookies(BASE_URL);

    for (const cookie of cookies) {
      if (cookie.key === 'PHPSESSID') {
        return Promise.resolve(true);
      }
    }

    return Promise.resolve(false);
  }

  private async findUserId(body: string) {
    const javascriptCheck = body.match(/pixiv\.user\.id = "(?<id>\d+)";/);

    if (javascriptCheck) {
      this.userId = javascriptCheck.groups?.id;
      return Promise.resolve();
    }

    const googleAnalyiticsCheck = body.match(
      /_gaq\.push\(\['_setCustomVar', 6, 'user_id', "(?<id>\d+)", 1\]\);/
    );

    if (googleAnalyiticsCheck) {
      this.userId = googleAnalyiticsCheck.groups?.id;
      return Promise.resolve();
    }

    const dataLayerCheck = body.match(
      /var dataLayer = .*user_id: "(?<id>\d+)"/
    );

    if (dataLayerCheck) {
      this.userId = dataLayerCheck.groups?.id;
      return Promise.resolve();
    }

    return Promise.reject();
  }

  async illustDetails(id: string | number): Promise<IllustDetailsResponse> {
    const url = `${WEB_API_URL}/illust/${id}`;

    const response: IllustDetailsResponse = await got
      .get(url, {
        headers: {
          'User-Agent': this.userAgent,
          Referer: BASE_URL,
          'X-User-Id': this.userId,
        },
        cookieJar: this.cookieJar,
      })
      .json();

    return Promise.resolve(response);
  }

  async illustPages(id: string | number): Promise<IllustPagesResponse> {
    const url = `${WEB_API_URL}/illust/${id}/pages`;

    const response: IllustPagesResponse = await got
      .get(url, {
        headers: {
          'User-Agent': this.userAgent,
          Referer: BASE_URL,
          'X-User-Id': this.userId,
        },
        cookieJar: this.cookieJar,
      })
      .json();

    return Promise.resolve(response);
  }

  async ugoiraMetaData(id: string | number): Promise<UgoiraMetaDataResponse> {
    const url = `${WEB_API_URL}/illust/${id}/ugoira_meta`;

    const response: UgoiraMetaDataResponse = await got
      .get(url, {
        headers: {
          'User-Agent': this.userAgent,
          Referer: BASE_URL,
          'X-User-Id': this.userId,
        },
        cookieJar: this.cookieJar,
      })
      .json();

    return Promise.resolve(response);
  }

  async pokeFile(url: string): Promise<Response<string>> {
    return got.head(url, {
      headers: {
        'User-Agent': this.userAgent,
        Referer: BASE_URL,
      },
      cookieJar: this.cookieJar,
    });
  }

  async getFile(url: string): Promise<Buffer> {
    const response = await got
      .get(url, {
        headers: {
          'User-Agent': this.userAgent,
          Referer: BASE_URL,
        },
        cookieJar: this.cookieJar,
      })
      .buffer();

    return Promise.resolve(response);
  }

  private makeSessionCookies(): Array<Cookie> {
    const session = new Cookie({
      key: 'PHPSESSID',
      value: this.sessionCookie,
      domain: 'pixiv.net',
      path: '/',
      httpOnly: false,
      secure: false,
    });

    return [session];
  }

  private defaultUserAgent(): string {
    const userAgent = new UserAgent({ deviceCategory: 'desktop' });
    return userAgent.toString();
  }
}

export default PixivWeb;
