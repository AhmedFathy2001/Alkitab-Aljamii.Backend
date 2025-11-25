import { Module, Global } from '@nestjs/common';
import { I18nModule, AcceptLanguageResolver, HeaderResolver } from 'nestjs-i18n';
import { join } from 'path';

@Global()
@Module({
  imports: [
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      fallbacks: {
        'en-*': 'en',
        'ar-*': 'ar',
      },
      loaderOptions: {
        path: join(__dirname, '/'),
        watch: process.env['NODE_ENV'] === 'development',
      },
      resolvers: [
        new HeaderResolver(['x-lang', 'accept-language']),
        AcceptLanguageResolver,
      ],
    }),
  ],
  exports: [I18nModule],
})
export class I18nConfigModule {}
