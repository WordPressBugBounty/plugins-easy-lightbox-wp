<?php
/**
 * Item ordering — the `order` attribute (Default / Random).
 *
 * @package ShapedPlugin\ShapedGallery
 */

declare(strict_types=1);

namespace ShapedPlugin\ShapedGallery\Render;

if ( ! defined( 'WPINC' ) ) {
	die;
}

/**
 * Applies the gallery's `order` attribute to a resolved MediaItem list.
 *
 * ## Why a shuffle needs a seed at all
 *
 * `shuffle()` would be one line and wrong. Ajax Pagination renders only the first
 * window server-side and fetches the rest through `/gallery-page`, which re-renders
 * from the SAME stored attributes via {@see LayoutRenderer::render_window()} — so
 * every window re-runs the ordering. An unseeded shuffle produces a different
 * permutation per request, and the visitor then gets page 2 sliced out of a
 * different deck than page 1: items repeat, others never appear, and the count in
 * the pagination bar stops describing what is on screen.
 *
 * So the permutation is a pure function of a seed, and the seed travels with the
 * page: `LayoutRenderer` mints one per render, publishes it as `data-ap-seed`, and
 * `app/frontend/pagination.js` echoes it back on every window request. One page
 * load therefore sees ONE deck, no matter how many windows it pulls or how the
 * Image Filter re-windows it — which is what makes "Random" mean "a different
 * order each visit" rather than "a different order each request".
 *
 * ## Why not mt_srand()
 *
 * `mt_srand()` reseeds the process-wide generator, so seeding a gallery's shuffle
 * would silently make every later `mt_rand()` in the request deterministic —
 * other plugins', WordPress's own. The generator here is self-contained for that
 * reason, and being self-contained is also what lets `verify-order.php` assert a
 * given seed produces a given permutation from the CLI.
 *
 * Pure static, no WordPress API at all.
 */
final class ItemOrder {

	/**
	 * Order the items for a gallery.
	 *
	 * Anything other than `random` returns the list untouched — the stored order IS
	 * "Default", and the author set it by dragging tiles in the Edit Gallery modal.
	 *
	 * @param array<int,array<string,mixed>> $items Resolved MediaItem list.
	 * @param string                         $order Order attribute (`default`|`random`).
	 * @param int                            $seed  Permutation seed.
	 * @return array<int,array<string,mixed>>
	 */
	public static function apply( array $items, string $order, int $seed ): array {
		if ( 'random' !== $order || count( $items ) < 2 ) {
			return $items;
		}

		return self::shuffle( $items, $seed );
	}

	/**
	 * Seed-driven Fisher-Yates shuffle.
	 *
	 * Keys are discarded (`array_values`) because the caller slices the result by
	 * offset and a preserved key would make `array_slice`'s output disagree with the
	 * index `render_item()` stamps on each tile.
	 *
	 * @param array<int,array<string,mixed>> $items Items.
	 * @param int                            $seed  Permutation seed.
	 * @return array<int,array<string,mixed>>
	 */
	private static function shuffle( array $items, int $seed ): array {
		$items = array_values( $items );
		$state = self::normalize_seed( $seed );

		for ( $i = count( $items ) - 1; $i > 0; $i-- ) {
			$state = self::next( $state );
			$j     = $state % ( $i + 1 );

			$swap         = $items[ $i ];
			$items[ $i ]  = $items[ $j ];
			$items[ $j ]  = $swap;
		}

		return $items;
	}

	/**
	 * A usable 32-bit generator state.
	 *
	 * Zero is the one value an xorshift cannot leave — every shift of 0 is 0, so a
	 * zero seed would return the list in its original order and "Random" would look
	 * broken for exactly one seed value. Folded to a fixed non-zero constant instead.
	 *
	 * @param int $seed Raw seed.
	 * @return int
	 */
	private static function normalize_seed( int $seed ): int {
		$state = abs( $seed ) & 0xFFFFFFFF;

		return 0 === $state ? 0x9E3779B9 : $state;
	}

	/**
	 * Advance the xorshift32 state.
	 *
	 * Masked to 32 bits at every step: PHP integers are 64-bit, so an unmasked left
	 * shift would keep growing instead of wrapping and the sequence would stop being
	 * xorshift — and, being seed-dependent, it would do so only for some seeds.
	 *
	 * @param int $state Current state (non-zero).
	 * @return int Next state.
	 */
	private static function next( int $state ): int {
		$state ^= ( $state << 13 ) & 0xFFFFFFFF;
		$state &= 0xFFFFFFFF;
		$state ^= $state >> 17;
		$state ^= ( $state << 5 ) & 0xFFFFFFFF;

		return $state & 0xFFFFFFFF;
	}
}
