/**
 * Generate dist/block/<name>/block.json from each app/blocks/<name>/index.js
 * `blockOptions` literal. Keeps the block metadata single-sourced in JS.
 */
const fs = require( 'fs' );
const path = require( 'path' );

const acceptedMetaDataKeys = [
	'$schema',
	'apiVersion',
	'name',
	'title',
	'category',
	'parent',
	'description',
	'keywords',
	'textdomain',
	'supports',
	'attributes',
];

function extractBlockMetadata( filePath ) {
	const content = fs.readFileSync( filePath, 'utf8' );
	const match = content.match( /const\s+blockOptions\s*=\s*({[\s\S]*?});/ );

	if ( ! match ) {
		console.error( `❌ blockOptions not found in ${ filePath }` );
		return {};
	}

	let objStr = match[ 1 ];

	try {
		// __() → plain string.
		objStr = objStr.replace( /__\(\s*['"]([^'"]+)['"][^)]*\)/g, ( _, text ) => `"${ text }"` );
		// Arrow functions returning JSX → null.
		objStr = objStr.replace( /:\s*\(.*?\)\s*=>\s*<[\s\S]*?>/g, ': null' );
		// Arrow functions with body → null.
		objStr = objStr.replace( /:\s*\(.*?\)\s*=>\s*{[\s\S]*?}/g, ': null' );
		// Component/function references → null.
		objStr = objStr.replace( /:\s*[A-Z][A-Za-z0-9_]*/g, ': null' );
		// Trailing commas.
		objStr = objStr.replace( /,\s*}/g, '}' ).replace( /,\s*]/g, ']' );

		// eslint-disable-next-line no-new-func
		const blockOptions = new Function( `return (${ objStr })` )();
		const metaDataObject = {
			$schema: 'https://schemas.wp.org/trunk/block.json',
			apiVersion: 3,
			category: 'shaped-gallery',
			textdomain: 'easy-lightbox-wp',
			...blockOptions,
		};

		const metaData = {};
		acceptedMetaDataKeys.forEach( ( metaKey ) => {
			if ( metaDataObject[ metaKey ] ) {
				metaData[ metaKey ] = metaDataObject[ metaKey ];
			}
		} );
		return metaData;
	} catch ( err ) {
		console.error( `❌ Parse error in ${ filePath }:`, err.message );
		return {};
	}
}

function generateMetadataJsonFile() {
	const appBlocksDir = path.join( __dirname, 'app', 'blocks' );
	if ( ! fs.existsSync( appBlocksDir ) ) {
		return;
	}
	const distBlocksDir = path.join( __dirname, 'dist', 'block' );
	const blockDirs = fs
		.readdirSync( appBlocksDir, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() )
		.map( ( d ) => d.name );

	blockDirs.forEach( ( dirName ) => {
		const jsIndexPath = path.join( appBlocksDir, dirName, 'index.js' );
		if ( ! fs.existsSync( jsIndexPath ) ) {
			return;
		}
		const metadata = extractBlockMetadata( jsIndexPath );
		const destinationDir = path.join( distBlocksDir, dirName );
		if ( ! fs.existsSync( destinationDir ) ) {
			fs.mkdirSync( destinationDir, { recursive: true } );
		}
		fs.writeFileSync(
			path.join( destinationDir, 'block.json' ),
			JSON.stringify( metadata, null, 4 )
		);
		console.log( `✓ block.json generated for ${ dirName }` );
	} );
}

generateMetadataJsonFile();
