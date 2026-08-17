FROM nginx:alpine

# Self-signed cert generated at build time so this image is fully
# reproducible with no committed key material. Production replaces this
# with a real cert (Let's Encrypt/managed) mounted or fetched at deploy
# time — see nginx.conf's comment on the 443 server block.
RUN apk add --no-cache openssl && \
    mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/selfsigned.key \
      -out /etc/nginx/certs/selfsigned.crt \
      -subj "/CN=localhost"

COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80 443
