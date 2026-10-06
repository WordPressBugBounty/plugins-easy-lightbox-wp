const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

module.exports = {
	...defaultConfig,
	output: {
		...defaultConfig.output,
		clean: false, // Four entry points share dist/ — never wipe siblings.
	},
	resolve: {
		...defaultConfig.resolve,
		alias: {
			...defaultConfig.resolve.alias,
			'@shaped-gallery/components': path.resolve( __dirname, 'app/components/' ),
			'@shaped-gallery/controls': path.resolve( __dirname, 'app/controls/Controls.jsx' ),
			'@shaped-gallery/hooks': path.resolve( __dirname, 'app/hooks/' ),
			'@shaped-gallery/layouts': path.resolve( __dirname, 'app/layouts/' ),
			'@shaped-gallery/picker': path.resolve( __dirname, 'app/picker/' ),
			'@shaped-gallery/media-manager': path.resolve( __dirname, 'app/media-manager/' ),
			'@shaped-gallery/lib': path.resolve( __dirname, 'app/lib/' ),
			'@shaped-gallery/icons': path.resolve( __dirname, 'app/icons/' ),
		},
	},
};
