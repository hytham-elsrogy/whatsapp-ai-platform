import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Customer } from "./entities/customer.entity";

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer)
    private readonly repo: Repository<Customer>,
  ) {}

  findAll(tenantId: string): Promise<Customer[]> {
    return this.repo.find({
      where: { tenantId },
      order: { lastInteractionAt: "DESC" },
    });
  }

  async findOne(tenantId: string, id: string): Promise<Customer> {
    const customer = await this.repo.findOne({ where: { id, tenantId } });
    if (!customer) throw new NotFoundException("Customer not found");
    return customer;
  }

  async findOrCreateByWhatsappNumber(
    tenantId: string,
    whatsappNumber: string,
    name?: string,
  ): Promise<Customer> {
    let customer = await this.repo.findOne({
      where: { tenantId, whatsappNumber },
    });
    if (!customer) {
      customer = this.repo.create({ tenantId, whatsappNumber, name });
      customer = await this.repo.save(customer);
    } else if (name && customer.name !== name) {
      customer.name = name;
    }
    customer.lastInteractionAt = new Date();
    return this.repo.save(customer);
  }
}
