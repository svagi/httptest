# Local SSL/TLS setup

For local development over SSL/TLS there is a pre-bundled self signed
certificate in `nginx/ssl/`.

The certificate is issued for:
```
*.httptest.net
httptest.net
*.httptest.local
httptest.local
192.168.99.100
```

Where `192.168.99.100` is IP of default docker-machine.

Browser probably start complain about untrusted self-signed certificate.
Best way to solve this is to trust `nginx/ssl/fullchain.crt` certificate at system level,
which results in trusted icon (green lock) in any browser.

![trust](trust.png)

See: https://gist.github.com/jed/6147872
