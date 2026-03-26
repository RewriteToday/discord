# use the official Bun image
# see all versions at https://hub.docker.com/r/oven/bun/tags
FROM oven/bun:1 AS base

COPY . /app

WORKDIR /app

# install dependencies into temp directory
# this will cache them and speed up future builds
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# install with --production (exclude devDependencies)
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# copy node_modules from temp directory
# then copy all (non-ignored) project files into the image
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# [optional] tests & build
ENV NODE_ENV=production
RUN bun run client:compile

FROM base
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/dist dist
COPY commands.json /app/commands.json
COPY seyfert.config.mjs /app/seyfert.config.mjs

RUN chown bun:bun /app/commands.json /app/seyfert.config.mjs

USER bun
CMD [ "bun", "dist/index.js" ]