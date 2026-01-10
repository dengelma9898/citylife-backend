import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Injectable } from '@nestjs/common';
import { EventCategoriesService } from '../../../event-categories/services/event-categories.service';

@ValidatorConstraint({ name: 'isValidCategory', async: true })
@Injectable()
export class IsValidCategoryConstraint implements ValidatorConstraintInterface {
  constructor(private readonly eventCategoriesService: EventCategoriesService) {}

  async validate(categoryId: any, args: ValidationArguments): Promise<boolean> {
    if (typeof categoryId !== 'string' || !categoryId) {
      return false;
    }

    try {
      const category = await this.eventCategoriesService.findOne(categoryId);
      return category !== null;
    } catch (error) {
      return false;
    }
  }

  defaultMessage(args: ValidationArguments): string {
    return 'categoryId muss eine gültige Event-Kategorie sein';
  }
}

export function IsValidCategory(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidCategoryConstraint,
    });
  };
}
