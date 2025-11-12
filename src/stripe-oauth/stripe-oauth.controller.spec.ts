import { Test, TestingModule } from '@nestjs/testing';
import { StripeOauthController } from './stripe-oauth.controller';

describe('StripeOauthController', () => {
  let controller: StripeOauthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeOauthController],
    }).compile();

    controller = module.get<StripeOauthController>(StripeOauthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
