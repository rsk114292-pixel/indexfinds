import { BatchJobItemStatus } from '../entities/batch-job-item.entity';
import {
  BatchItemStateMachine,
  InvalidStateTransitionError,
} from './batch-item-state';

describe('BatchItemStateMachine', () => {
  describe('canTransition', () => {
    describe('PENDING state', () => {
      it('should allow PENDING → FETCHING', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.PENDING,
            BatchJobItemStatus.FETCHING,
          ),
        ).toBe(true);
      });

      it('should NOT allow PENDING → GENERATING', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.PENDING,
            BatchJobItemStatus.GENERATING,
          ),
        ).toBe(false);
      });

      it('should NOT allow PENDING → PUBLISHED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.PENDING,
            BatchJobItemStatus.PUBLISHED,
          ),
        ).toBe(false);
      });
    });

    describe('FETCHING state', () => {
      it('should allow FETCHING → FETCHED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHING,
            BatchJobItemStatus.FETCHED,
          ),
        ).toBe(true);
      });

      it('should allow FETCHING → SKIPPED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHING,
            BatchJobItemStatus.SKIPPED,
          ),
        ).toBe(true);
      });

      it('should allow FETCHING → FAILED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHING,
            BatchJobItemStatus.FAILED,
          ),
        ).toBe(true);
      });

      it('should NOT allow FETCHING → PUBLISHED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHING,
            BatchJobItemStatus.PUBLISHED,
          ),
        ).toBe(false);
      });
    });

    describe('FETCHED state', () => {
      it('should allow FETCHED → GENERATING', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHED,
            BatchJobItemStatus.GENERATING,
          ),
        ).toBe(true);
      });

      it('should allow FETCHED → FAILED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FETCHED,
            BatchJobItemStatus.FAILED,
          ),
        ).toBe(true);
      });
    });

    describe('GENERATING state', () => {
      it('should allow GENERATING → REVIEW', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.GENERATING,
            BatchJobItemStatus.REVIEW,
          ),
        ).toBe(true);
      });

      it('should allow GENERATING → APPROVED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.GENERATING,
            BatchJobItemStatus.APPROVED,
          ),
        ).toBe(true);
      });

      it('should allow GENERATING → FAILED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.GENERATING,
            BatchJobItemStatus.FAILED,
          ),
        ).toBe(true);
      });
    });

    describe('REVIEW state', () => {
      it('should allow REVIEW → APPROVED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.REVIEW,
            BatchJobItemStatus.APPROVED,
          ),
        ).toBe(true);
      });

      it('should allow REVIEW → FAILED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.REVIEW,
            BatchJobItemStatus.FAILED,
          ),
        ).toBe(true);
      });

      it('should NOT allow REVIEW → PENDING', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.REVIEW,
            BatchJobItemStatus.PENDING,
          ),
        ).toBe(false);
      });
    });

    describe('APPROVED state', () => {
      it('should allow APPROVED → PUBLISHED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.APPROVED,
            BatchJobItemStatus.PUBLISHED,
          ),
        ).toBe(true);
      });

      it('should allow APPROVED → REVIEW (rollback on publish failure)', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.APPROVED,
            BatchJobItemStatus.REVIEW,
          ),
        ).toBe(true);
      });

      it('should allow APPROVED → FAILED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.APPROVED,
            BatchJobItemStatus.FAILED,
          ),
        ).toBe(true);
      });
    });

    describe('FAILED state', () => {
      it('should allow FAILED → PENDING (retry)', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FAILED,
            BatchJobItemStatus.PENDING,
          ),
        ).toBe(true);
      });

      it('should NOT allow FAILED → PUBLISHED', () => {
        expect(
          BatchItemStateMachine.canTransition(
            BatchJobItemStatus.FAILED,
            BatchJobItemStatus.PUBLISHED,
          ),
        ).toBe(false);
      });
    });

    describe('Terminal states', () => {
      it('should NOT allow PUBLISHED → any state', () => {
        const allStatuses = Object.values(BatchJobItemStatus);
        allStatuses.forEach((status) => {
          expect(
            BatchItemStateMachine.canTransition(
              BatchJobItemStatus.PUBLISHED,
              status,
            ),
          ).toBe(false);
        });
      });

      it('should NOT allow SKIPPED → any state', () => {
        const allStatuses = Object.values(BatchJobItemStatus);
        allStatuses.forEach((status) => {
          expect(
            BatchItemStateMachine.canTransition(
              BatchJobItemStatus.SKIPPED,
              status,
            ),
          ).toBe(false);
        });
      });
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() =>
        BatchItemStateMachine.validateTransition(
          BatchJobItemStatus.PENDING,
          BatchJobItemStatus.FETCHING,
        ),
      ).not.toThrow();
    });

    it('should throw InvalidStateTransitionError for invalid transition', () => {
      expect(() =>
        BatchItemStateMachine.validateTransition(
          BatchJobItemStatus.PENDING,
          BatchJobItemStatus.PUBLISHED,
        ),
      ).toThrow(InvalidStateTransitionError);
    });

    it('should include item ID in error message', () => {
      const itemId = 'test-item-123';
      try {
        BatchItemStateMachine.validateTransition(
          BatchJobItemStatus.PENDING,
          BatchJobItemStatus.PUBLISHED,
          itemId,
        );
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidStateTransitionError);
        expect((error as InvalidStateTransitionError).itemId).toBe(itemId);
        expect((error as InvalidStateTransitionError).message).toContain(
          itemId,
        );
      }
    });
  });

  describe('tryTransition', () => {
    it('should return success for valid transition', () => {
      const result = BatchItemStateMachine.tryTransition(
        BatchJobItemStatus.PENDING,
        BatchJobItemStatus.FETCHING,
      );
      expect(result.success).toBe(true);
      expect(result.from).toBe(BatchJobItemStatus.PENDING);
      expect(result.to).toBe(BatchJobItemStatus.FETCHING);
    });

    it('should return failure for invalid transition', () => {
      const result = BatchItemStateMachine.tryTransition(
        BatchJobItemStatus.PENDING,
        BatchJobItemStatus.PUBLISHED,
      );
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('helper methods', () => {
    describe('isTerminalState', () => {
      it('should return true for PUBLISHED', () => {
        expect(
          BatchItemStateMachine.isTerminalState(BatchJobItemStatus.PUBLISHED),
        ).toBe(true);
      });

      it('should return true for SKIPPED', () => {
        expect(
          BatchItemStateMachine.isTerminalState(BatchJobItemStatus.SKIPPED),
        ).toBe(true);
      });

      it('should return false for PENDING', () => {
        expect(
          BatchItemStateMachine.isTerminalState(BatchJobItemStatus.PENDING),
        ).toBe(false);
      });

      it('should return false for FAILED', () => {
        expect(
          BatchItemStateMachine.isTerminalState(BatchJobItemStatus.FAILED),
        ).toBe(false);
      });
    });

    describe('isRetryableState', () => {
      it('should return true for FAILED', () => {
        expect(
          BatchItemStateMachine.isRetryableState(BatchJobItemStatus.FAILED),
        ).toBe(true);
      });

      it('should return false for PENDING', () => {
        expect(
          BatchItemStateMachine.isRetryableState(BatchJobItemStatus.PENDING),
        ).toBe(false);
      });
    });

    describe('isSuccessState', () => {
      it('should return true for PUBLISHED', () => {
        expect(
          BatchItemStateMachine.isSuccessState(BatchJobItemStatus.PUBLISHED),
        ).toBe(true);
      });

      it('should return true for SKIPPED', () => {
        expect(
          BatchItemStateMachine.isSuccessState(BatchJobItemStatus.SKIPPED),
        ).toBe(true);
      });

      it('should return false for FAILED', () => {
        expect(
          BatchItemStateMachine.isSuccessState(BatchJobItemStatus.FAILED),
        ).toBe(false);
      });
    });

    describe('isProcessingState', () => {
      it('should return true for FETCHING', () => {
        expect(
          BatchItemStateMachine.isProcessingState(BatchJobItemStatus.FETCHING),
        ).toBe(true);
      });

      it('should return true for GENERATING', () => {
        expect(
          BatchItemStateMachine.isProcessingState(
            BatchJobItemStatus.GENERATING,
          ),
        ).toBe(true);
      });

      it('should return false for REVIEW', () => {
        expect(
          BatchItemStateMachine.isProcessingState(BatchJobItemStatus.REVIEW),
        ).toBe(false);
      });
    });

    describe('isAwaitingHumanAction', () => {
      it('should return true for REVIEW', () => {
        expect(
          BatchItemStateMachine.isAwaitingHumanAction(
            BatchJobItemStatus.REVIEW,
          ),
        ).toBe(true);
      });

      it('should return true for APPROVED', () => {
        expect(
          BatchItemStateMachine.isAwaitingHumanAction(
            BatchJobItemStatus.APPROVED,
          ),
        ).toBe(true);
      });

      it('should return false for GENERATING', () => {
        expect(
          BatchItemStateMachine.isAwaitingHumanAction(
            BatchJobItemStatus.GENERATING,
          ),
        ).toBe(false);
      });
    });

    describe('getAllowedTransitions', () => {
      it('should return allowed transitions for PENDING', () => {
        const allowed = BatchItemStateMachine.getAllowedTransitions(
          BatchJobItemStatus.PENDING,
        );
        expect(allowed).toContain(BatchJobItemStatus.FETCHING);
        expect(allowed).toHaveLength(1);
      });

      it('should return empty array for PUBLISHED', () => {
        const allowed = BatchItemStateMachine.getAllowedTransitions(
          BatchJobItemStatus.PUBLISHED,
        );
        expect(allowed).toHaveLength(0);
      });
    });

    describe('getStatusLabel', () => {
      it('should return Chinese label for PENDING', () => {
        expect(
          BatchItemStateMachine.getStatusLabel(BatchJobItemStatus.PENDING),
        ).toBe('待处理');
      });

      it('should return Chinese label for PUBLISHED', () => {
        expect(
          BatchItemStateMachine.getStatusLabel(BatchJobItemStatus.PUBLISHED),
        ).toBe('已发布');
      });
    });
  });
});
