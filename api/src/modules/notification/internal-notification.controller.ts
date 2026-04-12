import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common'
import { ApiOperation, ApiTags } from '@nestjs/swagger'
import { NotificationService } from './notification.service'
import type { PaymentConfirmedNotificationRequest } from '../../common/contracts/payment-confirmed-notification.contract'

@ApiTags('internal-notifications')
@Controller('internal/v1/notifications')
export class InternalNotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('payment-confirmed')
  @ApiOperation({ summary: 'Internal: create payment-confirmed notification' })
  async paymentConfirmed(
    @Body() body: PaymentConfirmedNotificationRequest,
    @Headers('x-internal-service') internalService: string | undefined,
    @Headers('x-internal-token') internalToken: string | undefined,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!internalService || internalService !== 'api-finance') {
      throw new UnauthorizedException('Invalid internal service')
    }

    const expectedToken = process.env['INTERNAL_SERVICE_TOKEN'] ?? 'dev-internal-token'
    if (!internalToken || internalToken !== expectedToken) {
      throw new UnauthorizedException('Invalid internal token')
    }

    if (!idempotencyKey) {
      throw new BadRequestException('x-idempotency-key zorunludur')
    }

    if (!body?.tenantId || !body?.paymentId || !body?.unitId) {
      throw new BadRequestException('tenantId, paymentId, unitId zorunludur')
    }

    const result = await this.notificationService.createForPayment(
      body.tenantId,
      body.paymentId,
      body.unitId,
      body.amount,
    )

    return {
      data: {
        accepted: true,
        notificationId: result.notificationId,
        idempotentReplay: result.idempotentReplay,
      },
    }
  }
}
