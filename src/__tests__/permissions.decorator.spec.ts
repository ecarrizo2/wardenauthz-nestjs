import 'reflect-metadata'
import { RequiresPermission } from '../decorators/permissions.decorator'
import { REQUIRED_PERMISSION } from '../guards/permission.guard'

describe('RequiresPermission', () => {
  describe('when used as a method decorator', () => {
    it('should set REQUIRED_PERMISSION metadata with the provided resource and action', () => {
      class TestController {
        @RequiresPermission('documents', 'read')
        testMethod(): void {}
      }

      const metadata = Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.testMethod)

      expect(metadata).toEqual({ resource: 'documents', action: 'read' })
    })

    it('should support different resource and action combinations', () => {
      class TestController {
        @RequiresPermission('admin', 'access')
        firstMethod(): void {}

        @RequiresPermission('billing', 'write')
        secondMethod(): void {}
      }

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.firstMethod)).toEqual({
        resource: 'admin',
        action: 'access',
      })

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.secondMethod)).toEqual({
        resource: 'billing',
        action: 'write',
      })
    })

    it('should not set metadata on unrelated methods', () => {
      class TestController {
        @RequiresPermission('admin', 'access')
        protected(): void {}

        public(): void {}
      }

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.protected)).toEqual({
        resource: 'admin',
        action: 'access',
      })

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.public)).toBeUndefined()
    })
  })

  describe('when used as a class decorator', () => {
    it('should set REQUIRED_PERMISSION metadata on the class itself', () => {
      @RequiresPermission('admin', 'access')
      class TestController {}

      const metadata = Reflect.getMetadata(REQUIRED_PERMISSION, TestController)

      expect(metadata).toEqual({ resource: 'admin', action: 'access' })
    })

    it('should cascade to all methods when used on a class', () => {
      @RequiresPermission('admin', 'access')
      class TestController {
        listUsers(): void {}
        getSettings(): void {}
      }

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController)).toEqual({
        resource: 'admin',
        action: 'access',
      })
    })
  })

  describe('composability', () => {
    it('should allow a class-level decorator and a method-level override', () => {
      @RequiresPermission('documents', 'read')
      class TestController {
        @RequiresPermission('documents', 'delete')
        deleteDocument(): void {}

        listDocuments(): void {}
      }

      expect(Reflect.getMetadata(REQUIRED_PERMISSION, TestController)).toEqual({
        resource: 'documents',
        action: 'read',
      })

      expect(
        Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.deleteDocument)
      ).toEqual({
        resource: 'documents',
        action: 'delete',
      })

      expect(
        Reflect.getMetadata(REQUIRED_PERMISSION, TestController.prototype.listDocuments)
      ).toBeUndefined()
    })
  })
})
