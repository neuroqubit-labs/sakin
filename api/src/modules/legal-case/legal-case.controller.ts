import { Controller, Get, Post, Patch, Delete, Param, Body, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { LegalCaseService } from './legal-case.service'
import { Tenant } from '../../common/decorators/tenant.decorator'
import { Roles } from '../../common/decorators/roles.decorator'
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe'
import {
  CreateLegalCaseSchema,
  UpdateLegalCaseSchema,
  LegalCaseFilterSchema,
  CreateLegalCaseEventSchema,
  UserRole,
} from '@sakin/shared'
import type { TenantContext } from '@sakin/shared'

@ApiTags('legal-cases')
@ApiBearerAuth()
@Controller('legal-cases')
export class LegalCaseController {
  constructor(private readonly legalCaseService: LegalCaseService) {}

  @Post()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Hukuki süreç başlat' })
  create(
    @Body(new ZodValidationPipe(CreateLegalCaseSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.legalCaseService.create(
      dto as Parameters<LegalCaseService['create']>[0],
      ctx.tenantId!,
    )
  }

  @Get()
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Hukuki süreçleri listele' })
  findAll(@Query() query: unknown, @Tenant() ctx: TenantContext) {
    const filter = LegalCaseFilterSchema.parse(query)
    return this.legalCaseService.findAll(filter, ctx.tenantId!)
  }

  @Get(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Hukuki süreç detayı' })
  findOne(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.legalCaseService.findOne(id, ctx.tenantId!)
  }

  @Patch(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Hukuki süreç güncelle' })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateLegalCaseSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.legalCaseService.update(
      id,
      dto as Parameters<LegalCaseService['update']>[1],
      ctx.tenantId!,
    )
  }

  @Delete(':id')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Hukuki süreç sil' })
  delete(@Param('id') id: string, @Tenant() ctx: TenantContext) {
    return this.legalCaseService.delete(id, ctx.tenantId!)
  }

  @Post(':id/events')
  @Roles(UserRole.TENANT_ADMIN)
  @ApiOperation({ summary: 'Süreç olayı ekle' })
  addEvent(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(CreateLegalCaseEventSchema)) dto: unknown,
    @Tenant() ctx: TenantContext,
  ) {
    return this.legalCaseService.addEvent(
      id,
      dto as Parameters<LegalCaseService['addEvent']>[1],
      ctx.tenantId!,
      ctx.userId,
    )
  }
}
