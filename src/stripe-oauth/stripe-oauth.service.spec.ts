import { Test, TestingModule } from '@nestjs/testing';
import { StripeOAuthService } from './stripe-oauth.service';

describe('StripeOauthService', () => {
  let service: StripeOAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StripeOAuthService],
    }).compile();

    service = module.get<StripeOAuthService>(StripeOAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
