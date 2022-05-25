import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './modules/user/user.module';
import { OrmConfig } from '../ormconfig';
import { CompanyModule } from './modules/company/company.module';
import { APP_FILTER } from '@nestjs/core';
import { HttpExceptionFilter } from './utils/http-exception-filter';
import { AuthModule } from './modules/auth/auth.module';
import { SharedModule } from './shared/shared.module';
import { LanguageModule } from './modules/language/language.module';
import { CountryModule } from './modules/country/country.module';
import { UserLanguageModule } from './modules/user-language/user-language.module';
import { RegionModule } from './modules/region/region.module';
import { CategoryModule } from './modules/category/category.module';
import { SkillModule } from './modules/skill/skill.module';
import { SpecificationModule } from './modules/specification/specification.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      ...OrmConfig,
      autoLoadEntities: true,
    }),
    SharedModule,
    AuthModule,
    UserModule,
    CompanyModule,
    LanguageModule,
    CountryModule,
    UserLanguageModule,
    RegionModule,
    CategoryModule,
    SkillModule,
    SpecificationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {
  // configure(consumer: MiddlewareConsumer) {
  //   consumer.apply(AuthMiddleware).forRoutes({
  //     path: '*',
  //     method: RequestMethod.ALL,
  //   });
  // }
}
