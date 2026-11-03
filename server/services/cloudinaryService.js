const cloudinary =  require ('../config/cloudinary');

const uploadImage =(fileBuffer , folder = 'ecommerce/products' ) => {
    return new Promise((resolve, reject) => {
        const uploadStream =  cloudinary.uploader.upload_stream({
            folder,
            resource_type: 'image',
        },
        (error, result) => {
    if(error) {
        return reject(error);
    }

    resolve({
        url: result.secure_url,
        publicId: result.public_id,
    });
         }
        );

        uploadStream.end(fileBuffer);
        
    });
};

const deleteImage = async (publicId) => {
    if(!publicId) {
        throw new Error('Cloudinary public ID is required.');
    }
    return cloudinary.uploader.destroy(publicId, {
        resource_type: 'image',
        invalidate: true,
    });
};

module.exports = {
    uploadImage,
    deleteImage,
}