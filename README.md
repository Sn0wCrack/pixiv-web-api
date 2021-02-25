# pixiv-web-api

An implementation of the pixiv web API for use in TypeScript.

Currently not much is implemented and the implementation is very rough, but it does work.

The following is what is implemented:

* Authentication
  * via Cookie
* Fetching Illustration Details
* Fetching Illustration Pages
* Fetching Ugoira Metadata

## Examples

### Authentication

pixiv-web-api offers two methods of Authentication with pixiv, however currently only one works.

#### Cookie Authentication

When constructing the API or calling the `login` method, fill in the `cookie` field of the auth parameter.

```typescript
const api = new PixivWeb({
    cookie: 'value',
});

api.login();

// or ...

const api = new PixivWeb();

api.login({
    cookie: 'value',
});
```

The value of this cookie field should be the value of the `PHPSESSID` cookie stored on pixiv.net.

**PLEASE NOTE**: If you continue to use the account / session that this cookie belongs to, you may need to rotate this value, as the session may become invalid from accessing it elsewhere. I would reccomend creating this session on a browser you don't normally use the associated account in normally for the best experience here.

#### Password Authentication

This method currently does not work due to the pixiv API requiring a Google reCaptcha response, which cannot be bypassed.
