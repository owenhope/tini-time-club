interface StripNameFromAddressParams {
    name: string;
    address: string;
}

interface StripNameFromAddressFunction {
    (name: string, address: string): string;
}

export const stripNameFromAddress: StripNameFromAddressFunction = (name, address) => {
    if (!name || !address) return address;

    const normalizedName = name.trim().toLowerCase();
    const normalizedAddress = address.trim();

    const regex = new RegExp(`^${normalizedName}[,\\s]*`, "i"); // Remove name + optional comma/space at start
    return normalizedAddress.replace(regex, "").trim();
};