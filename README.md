# Tulipános Porta és Vendégház

A Tulipános Porta weboldala és foglaltsági naptára.

## Helyi futtatás (Local Development)

A naptár a Google Naptár iCal feedjét olvassa. A böngésző CORS korlátozásai miatt a helyi teszteléshez használja a mellékelt fejlesztői szervert, amely automatikusan közvetíti (proxyzza) a naptárkéréseket (pontosan úgy, ahogy a Netlify teszi élesben a `_redirects` szabállyal):

```bash
python3 server.py
```

A weboldal ezután elérhető a [http://localhost:3000](http://localhost:3000) címen.

Alternatívaként a Netlify CLI-vel is futtatható:
```bash
npx netlify dev
```

## Éles környezet (Production / Netlify)

A Netlify környezetben a `_redirects` fájl automatikusan közvetíti a `/api/calendar/*` kéréseket a Google Naptár felé, így semmilyen külső CORS proxyra vagy API kulcsra nincs szükség.
