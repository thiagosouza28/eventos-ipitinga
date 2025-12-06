import { AppError } from "@/utils/errors";

import {
  BasePixGateway,
  type PixChargeResponse,
  type PixChargeStatus,
  type PixGatewayProvider,
  type PixOrderContext
} from "./BasePixGateway";

const notImplemented = (label: string): never => {
  throw new AppError(`Gateway PIX ${label} ainda não foi implementado neste ambiente.`, 501);
};

export class SicoobPixGateway extends BasePixGateway {
  readonly provider: PixGatewayProvider = "sicoob";

  async createCharge(_order: PixOrderContext): Promise<PixChargeResponse> {
    return notImplemented("Sicoob");
  }

  async getChargeStatus(_chargeId: string): Promise<PixChargeStatus> {
    return notImplemented("Sicoob");
  }
}
