# angular2-jwt-refresh

This package extends [angular2-jwt](https://github.com/auth0/angular2-jwt) and was made to deal with refresh token.


## Instalation

```
npm i angular2-jwt-refresh --save
```

Don't forget to install the peer dependencies
```
npm i @angular/core @angular/http angular2-jwt rxjs --save
```


## Configuration

```typescript
import { NgModule } from '@angular/core';
import { Http, RequestOptions, Response } from '@angular/http';
import { AuthConfig } from 'angular2-jwt';
import { JwtConfigService, JwtHttp } from 'angular2-jwt-refresh';

@NgModule({
  providers: [{
    provide: JwtHttp,
    useFactory: getJwtHttp,
    deps: [ Http, RequestOptions ]
  }]
})
export class AppModule {}

export function getJwtHttp(http: Http, options: RequestOptions) {
  let jwtOptions = {
    endPoint: 'https://myapi.domain.com/auth',
    // optional
    payload: { type: 'refresh' },
    beforeSeconds: 600, // refresh tokeSn before 10 min
    tokenName: 'refresh_token',
    refreshTokenGetter: (() => localStorage.getItem('refresh_token')),
    tokenSetter: ((res: Response): boolean | Promise<void> => {
      res = res.json();

      if (!res['id_token'] || !res['refresh_token']) {
        localStorage.removeItem('id_token');
        localStorage.removeItem('refresh_token');

        return false;
      }

      localStorage.setItem('id_token', res['id_token']);
      localStorage.setItem('refresh_token', res['refresh_token']);

      return true;
    })
  };
  let authConfig = new AuthConfig({
    noJwtError: true,
    globalHeaders: [{'Accept': 'application/json'}],
    tokenGetter: (() => localStorage.getItem('id_token')),
  });

  return new JwtHttp(
    new JwtConfigService(jwtOptions, authConfig),
    http,
    options
  );
}
```

## Using JwtHttp
```typescript
import { Injectable } from '@angular/core';
import { Response } from '@angular/http';
import { JwtHttp } from 'angular2-jwt-refresh';
import { Observable } from 'rxjs/Observable';
import 'rxjs/Rx';

import { AppConfig } from '../AppConfig';

@Injectable()
export class DataService {
  private baseUrl: string = AppConfig.baseUrl + '/data';

  constructor(private jwtHttp: JwtHttp) { }

  getData(id: number): Observable<any> {
    const url = this.baseUrl + '/' + id;

    return this.jwtHttp
      .get(url)
      .map((res: Response) => {
        return res.json();
      });
  }

  saveData(data: any): Observable<string> {
    const url = this.baseUrl + '/' (data['id'] ? data['id'] : '');

    return this.jwtHttp
      .post(url, data)
      .map((res: Response) => {
        return res.json();
      });
  }
}
```
