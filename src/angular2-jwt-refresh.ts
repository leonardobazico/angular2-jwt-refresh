import {
  Injectable,
  ModuleWithProviders,
  NgModule,
  Optional,
  SkipSelf
} from '@angular/core';
import {
  Http,
  HttpModule,
  Request,
  RequestMethod,
  RequestOptions,
  RequestOptionsArgs,
  Response
} from '@angular/http';
import {
  AuthConfig,
  AuthHttp,
  IAuthConfig,
  JwtHelper
} from 'angular2-jwt';
import 'rxjs';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';


@Injectable()
export class JwtHttp extends AuthHttp {
  protected _config: IAuthConfig;
  protected _defOpts: RequestOptions;
  protected _http: Http;

  protected jwtHelper = new JwtHelper();
  protected isRefreshing = false;
  protected refreshConfig: RefreshConfig;
  protected refresherStream: Subject<boolean> = new Subject<boolean>();
  public refreshTokenStream: Subject<string> = new Subject<string>();

  constructor(refreshConfigService: JwtConfigService,
              http: Http,
              defOpts?: RequestOptions) {
    super(refreshConfigService.getAuthOptions(), http, defOpts);

    this.refreshConfig = refreshConfigService.getRefreshConfig();

    if (!this.refreshConfig || !this.refreshConfig.endPoint) {
      throw 'No refreshConfig';
    }

    this._config = refreshConfigService.getAuthConfig();
    this._defOpts = defOpts;
    this._http = http;
  }

  public request(url: string | Request, options?: RequestOptionsArgs): Observable<Response> {
    let token: string | Promise<string> = this._config.tokenGetter();

    if (token instanceof Promise) {
      return Observable
        .fromPromise(token)
        .mergeMap((jwtToken: string) => this.refreshTheToken(jwtToken))
        .mergeMap(() => super.request(url, options));
    }

    return this.refreshTheToken(token)
      .mergeMap(() => super.request(url, options));
  }

  public refreshTheToken(accessToken: string) {
    if (!accessToken || !this.jwtHelper.isTokenExpired(accessToken, this.refreshConfig.beforeSeconds)) {
      return Observable.of(accessToken);
    }

    // if is refreshing token, wait next false value
    if (this.isRefreshing) {
      return Observable.create((observer) => {
        this.refresherStream
          .subscribe((value) => {
            if (!value) {
              observer.next();
              observer.complete();
            }
          });
      });
    } else {
      return this._refreshTheToken();
    }
  }

  protected _refreshTheToken() {
    this.setRefreshing(true);

    let options = new RequestOptions({
      body: this.refreshConfig.payload,
      method: RequestMethod.Post,
      url: this.refreshConfig.endPoint
    });
    let req = new Request(this._mergeOptions(options, this._defOpts));
    let refreshToken: string | Promise<string> = this.refreshConfig.refreshTokenGetter();
    let request;

    if (refreshToken instanceof Promise) {
      request = Observable
        .fromPromise(refreshToken)
        .mergeMap((jwtToken: string) => this._requestWithToken(req, jwtToken));
    } else {
      request = this._requestWithToken(req, refreshToken);
    }

    return request
      .flatMap((res: any) => {
        const tokenSetter = this.refreshConfig.tokenSetter(res);
        const onError = Observable.throw('Impossible to get new token');

        if (tokenSetter instanceof Promise) {
          return Observable
            .fromPromise(tokenSetter)
            .catch(() => {

              this.setRefreshing(false);
              this.emitRefreshToken();

              return onError;
            })
            .concatMap(() => Observable.of(res));
        }

        if (!tokenSetter) {
          return onError;
        }

        return Observable.of(res);
      })
      .concatMap((res) => {
        this.setRefreshing(false);
        this.emitRefreshToken();

        return Observable.of(res);
      });
  }

  protected _mergeOptions(providedOpts: RequestOptionsArgs, defaultOpts?: RequestOptions) {
    let newOptions = defaultOpts || new RequestOptions();
    if (this._config.globalHeaders) {
      this.setGlobalHeaders(this._config.globalHeaders, providedOpts);
    }

    newOptions = newOptions.merge(new RequestOptions(providedOpts));

    return newOptions;
  }

  protected _requestWithToken(req: Request, token: string): Observable<Response> {
    req.headers.set(this._config.headerName, this._config.headerPrefix + token);

    return this.httpRequest(req);
  }

  private httpRequest(req: Request) {
    return this._http.request(req);
  }

  private setRefreshing(value: boolean) {
    this.isRefreshing = value;
    this.refresherStream.next(this.isRefreshing);
  }

  private emitRefreshToken() {
    const refreshToken = this.refreshConfig.refreshTokenGetter();

    if (refreshToken instanceof Promise) {
      return refreshToken.then(
        (token: string) => this.refreshTokenStream.next(token),
        () => this.refreshTokenStream.next(null)
      );
    }

    this.refreshTokenStream.next(refreshToken);
  }
}

export interface RefreshConfig {
  endPoint: string;
  payload?: any;
  beforeSeconds?: number;
  tokenName?: string;
  refreshTokenGetter?(): string | Promise<string>;
  tokenSetter?(res: Response): boolean | Promise<void>;
}

export class JwtConfigService {
  constructor(protected refreshConfig: RefreshConfig,
              protected authOptions: AuthConfig) {
    this.refreshConfig.payload = this.refreshConfig.payload || { };
    this.refreshConfig.beforeSeconds = this.refreshConfig.beforeSeconds === 0 ? 0 : (this.refreshConfig.beforeSeconds || 600);
    this.refreshConfig.tokenName = this.refreshConfig.tokenName || 'refresh_token';

    this.refreshConfig.refreshTokenGetter = this.refreshConfig.refreshTokenGetter ||
      (() => localStorage.getItem(this.refreshConfig.tokenName) as string);

    this.refreshConfig.tokenSetter = this.refreshConfig.tokenSetter ||
      ((res: any): boolean | Promise<void> => {
        res = res.json();

        if (!res || !res[this.refreshConfig.tokenName] || !res[this.getAuthConfig().tokenName]) {
          localStorage.removeItem(this.refreshConfig.tokenName);
          localStorage.removeItem(this.getAuthConfig().tokenName);

          return false;
        }

        localStorage.setItem(this.refreshConfig.tokenName, res[this.refreshConfig.tokenName]);
        localStorage.setItem(this.getAuthConfig().tokenName, res[this.getAuthConfig().tokenName]);

        return true;
      });
  }

  getRefreshConfig(): RefreshConfig {
    return this.refreshConfig;
  }

  getAuthOptions(): AuthConfig {
    return this.authOptions;
  }

  getAuthConfig(): IAuthConfig {
    return this.authOptions.getConfig();
  }
}

@NgModule({
  imports: [ HttpModule ],
  providers: [
    AuthConfig,
    AuthHttp,
    JwtConfigService,
    JwtHelper,
    JwtHttp
  ]
})
export class JwtHttpModule {
  static forRoot(): ModuleWithProviders {
    return {
      ngModule: JwtHttpModule,
      providers: [ ]
    };
  }

  constructor(@Optional() @SkipSelf() parentModule: JwtHttpModule) {
    if (parentModule) {
      throw new Error('JwtHttpModule is already loaded.');
    }
  }
}
