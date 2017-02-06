# angular2-jwt-refresh

This package extends [angular2-jwt](https://github.com/auth0/angular2-jwt) and was made to deal with refresh token.


## Instalation

```
npm i angular2-jwt-refresh --save
```


## Configuration

```typescript
import { NgModule } from '@angular/core';
import { Http } from '@angular/http';
import { AuthConfig, JwtConfigService, JwtHttp } from 'angular2-jwt-refresh';

@NgModule({
  providers: [{
    provide: JwtHttp,
    useFactory: getJwtHttp,
    deps: [ Http ]
  }]
})
export class AppModule {}

export function getJwtHttp(http) {
  let jwtOptions = {
    endPoint: 'https://myapi.domain.com/auth',
    // optional
    payload: { type: 'refresh' },
    beforeSeconds: 600, // refresh tokeSn before 10 min
    tokenName: 'refresh_token',
    refreshTokenGetter: (() => localStorage.getItem('refresh_token')),
    tokenSetter: ((res: any): boolean | Promise<void> => {
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
    http
  );
}
```
